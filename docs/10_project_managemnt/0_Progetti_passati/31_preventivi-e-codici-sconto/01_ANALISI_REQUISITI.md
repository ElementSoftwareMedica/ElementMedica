# 📋 Analisi Requisiti - Sistema Preventivi e Codici Sconto

**Progetto**: Sistema Preventivi con Gestione Codici Sconto  
**Data Inizio Analisi**: 8 Novembre 2025  
**Versione**: 1.0  
**Status**: 🔍 FASE ANALISI

---

## 🎯 Obiettivo del Progetto

Implementare un sistema completo di gestione preventivi integrato nel workflow di pianificazione corsi (ScheduleEventModal Step 4), con un sistema avanzato di codici sconto configurabili, template PDF eleganti e conformità GDPR.

---

## 📊 Analisi del Contesto Esistente

### 🔍 Stato Attuale

#### ScheduleEventModal - Struttura Attuale
```
Step 0: Dettagli Corso (Course Details)
Step 1: Selezione Aziende/Partecipanti (Company/Employee Selection)
Step 2: Gestione Presenze (Attendance Manager)
Step 3: Documenti (Document Manager)
```

**Mancante**: Step 4 per preventivi e pricing

#### Database Schema Esistente
```prisma
model Company {
  // ... existing fields
  preventivoAzienda  PreventivoAzienda[]
}

model Person {
  // ... existing fields
  // Nessun link diretto a preventivi
}

model CourseSchedule {
  id String @id @default(uuid())
  // ... existing fields
  // Mancano campi per pricing
}
```

#### Template System Esistente
- ✅ Google Docs/Slides API integrata
- ✅ Sistema marker placeholder funzionante
- ✅ Generazione PDF automatica
- ✅ Cleanup file temporanei implementato
- ❌ Nessun template per preventivi

---

## 📝 Requisiti Funzionali

### 1. Sistema Codici Sconto

#### 1.1 Caratteristiche Codice Sconto
```typescript
interface CodiceSconto {
  // Identificazione
  id: string;
  codice: string;              // Es: "PROMO2025", "SCONTO10"
  nome: string;                // Nome descrittivo
  descrizione?: string;        // Descrizione dettagliata
  
  // Tipo e Valore Sconto
  tipoSconto: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
  valore: number;              // Es: 10 (%), 50 (€)
  
  // Validità Temporale
  dataInizio: Date;
  dataFine: Date;
  attivo: boolean;
  
  // Restrizioni Utilizzo
  utilizzoMassimo?: number;    // Null = illimitato
  utilizzoCorrente: number;    // Contatore utilizzi
  utilizzoPerUtente?: number;  // Max per singolo utente
  
  // Restrizioni Applicabilità
  cumulabile: boolean;         // Combinabile con altri sconti
  minImporto?: number;         // Importo minimo per applicare
  maxImporto?: number;         // Importo massimo sconto
  
  // Restrizioni Entità
  applicabileA: 'TUTTI' | 'AZIENDE' | 'PERSONE' | 'SPECIFICI';
  aziende?: string[];          // IDs aziende specifiche
  persone?: string[];          // IDs persone specifiche
  
  // Restrizioni Corsi
  tipoCorso?: 'TUTTI' | 'SPECIFICI';
  corsiApplicabili?: string[]; // IDs corsi specifici
  categorieCorso?: string[];   // Categorie applicabili
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;            // Soft delete
  tenantId: string;            // Multi-tenancy
}
```

#### 1.2 Validazione Codice Sconto
```typescript
interface ValidazioneCodice {
  valido: boolean;
  motivo?: string;
  scontoCalcolato?: number;
  messaggioUtente: string;
}

// Regole di validazione:
// 1. Codice esistente e attivo
// 2. Data corrente tra dataInizio e dataFine
// 3. Utilizzi disponibili (se limitato)
// 4. Importo preventivo >= minImporto
// 5. Utente/azienda nella lista autorizzati (se ristretto)
// 6. Corso nella lista corsi applicabili (se ristretto)
// 7. Cumulabilità rispettata se già applicato altro sconto
```

#### 1.3 Calcolo Sconto
```typescript
interface CalcoloSconto {
  importoBase: number;
  codiciApplicati: CodiceSconto[];
  scontoTotale: number;
  importoFinale: number;
  dettaglioSconti: {
    codice: string;
    valore: number;
    tipo: string;
  }[];
}

// Logica calcolo:
// 1. Ordina codici per priorità (non cumulabili prima)
// 2. Applica sconti percentuali prima di assoluti
// 3. Rispetta maxImporto per singolo sconto
// 4. Calcola totale senza mai andare sotto 0
```

### 2. Sistema Preventivi

#### 2.1 Struttura Preventivo
```typescript
interface Preventivo {
  // Identificazione
  id: string;
  numero: string;              // Es: "PREV/2025/000001"
  annoProgressivo: number;
  numeroProgressivo: number;
  
  // Riferimenti
  scheduleId?: string;         // Link a CourseSchedule
  corsoId: string;             // Corso oggetto del preventivo
  clienteType: 'AZIENDA' | 'PERSONA';
  aziendaId?: string;
  personaId?: string;
  
  // Dati Corso
  titoloCorso: string;
  descrizioneCorso?: string;
  durataOre: number;
  numeroPartecipanti: number;
  modalitaErogazione: string;
  
  // Prezzi
  prezzoUnitario: number;      // Prezzo per partecipante
  prezzoTotale: number;        // prezzoUnitario * numeroPartecipanti
  
  // Sconti Applicati
  codiciScontoApplicati: {
    codiceId: string;
    codice: string;
    descrizione: string;
    valore: number;
    tipo: 'PERCENTUALE' | 'VALORE_ASSOLUTO';
  }[];
  scontoTotale: number;
  importoFinale: number;
  
  // Date
  dataEmissione: Date;
  dataScadenza: Date;
  
  // Status
  stato: 'BOZZA' | 'INVIATO' | 'ACCETTATO' | 'RIFIUTATO' | 'SCADUTO' | 'CONVERTITO';
  dataInvio?: Date;
  dataAccettazione?: Date;
  dataRifiuto?: Date;
  motivoRifiuto?: string;
  
  // Note
  note?: string;
  condizioniPagamento?: string;
  
  // File
  fileUrl?: string;            // Path PDF generato
  fileName?: string;
  fileSize?: number;
  
  // Metadata
  generatedBy: string;
  generatedAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  tenantId: string;
}
```

#### 2.2 Workflow Preventivo
```
1. CREAZIONE (Step 4 ScheduleEventModal)
   ↓
2. CALCOLO AUTOMATICO
   - Prezzo base da configurazione corso
   - Applicazione codici sconto (se presenti)
   - Calcolo totale finale
   ↓
3. GENERAZIONE PDF
   - Template elegante professionale
   - Dati cliente e corso
   - Dettaglio prezzi e sconti
   - Condizioni e scadenza
   ↓
4. INVIO (Opzionale)
   - Email al cliente
   - Link per accettazione online
   ↓
5. TRACCIAMENTO STATUS
   - Accettato → Converte in CourseSchedule confermato
   - Rifiutato → Registra motivo
   - Scaduto → Notifica automatica
```

### 3. Integrazione Step 4 - ScheduleEventModal

#### 3.1 Posizionamento
```
Step 0: Dettagli Corso
Step 1: Selezione Aziende/Partecipanti
Step 2: Gestione Presenze
Step 3: Documenti
Step 4: Preventivo e Pricing (NUOVO)
```

#### 3.2 UI Step 4
```tsx
<StepPreventivo>
  {/* Sezione 1: Riepilogo Corso */}
  <RiepilogoCorso
    corso={selectedCourse}
    partecipanti={selectedPersons.length}
    aziende={selectedCompanies}
    durataOre={totalHours}
  />
  
  {/* Sezione 2: Configurazione Prezzi */}
  <ConfigurazionePrezzi
    prezzoBase={coursePrice}
    numeroPartecipanti={participantsCount}
    onChangePrezzoUnitario={handlePriceChange}
  />
  
  {/* Sezione 3: Applicazione Codici Sconto */}
  <ApplicazioneCodiciSconto
    codiceInserito={discountCode}
    onApplicaCodice={handleApplyDiscount}
    codiciApplicati={appliedDiscounts}
    onRimuoviCodice={handleRemoveDiscount}
  />
  
  {/* Sezione 4: Riepilogo Finale */}
  <RiepilogoFinale
    prezzoTotale={totalPrice}
    sconti={discounts}
    importoFinale={finalAmount}
  />
  
  {/* Sezione 5: Azioni */}
  <AzioniPreventivo
    onGeneraPreventivo={handleGenerateQuote}
    onInviaEmail={handleSendEmail}
    onSalvaBozza={handleSaveDraft}
  />
</StepPreventivo>
```

### 4. Gestione Codici Sconto (Admin)

#### 4.1 Pagina Lista Codici Sconto
```tsx
<CodiciScontoPage>
  {/* Header con azioni */}
  <PageHeader
    title="Codici Sconto"
    actions={
      <Button onClick={openCreateModal}>
        + Nuovo Codice Sconto
      </Button>
    }
  />
  
  {/* Filtri */}
  <FiltersBar
    filters={[
      { field: 'stato', options: ['Attivi', 'Scaduti', 'Esauriti'] },
      { field: 'tipo', options: ['Percentuale', 'Valore Assoluto'] },
      { field: 'applicabilita', options: ['Tutti', 'Aziende', 'Persone'] }
    ]}
  />
  
  {/* Tabella */}
  <DataTable
    columns={[
      { key: 'codice', label: 'Codice', sortable: true },
      { key: 'nome', label: 'Nome', sortable: true },
      { key: 'valore', label: 'Sconto', render: formatDiscount },
      { key: 'validita', label: 'Validità', render: formatDateRange },
      { key: 'utilizzi', label: 'Utilizzi', render: formatUsage },
      { key: 'stato', label: 'Stato', render: StatusBadge },
      { key: 'azioni', label: 'Azioni', render: ActionsMenu }
    ]}
    data={codiciSconto}
    onRowClick={handleRowClick}
  />
</CodiciScontoPage>
```

#### 4.2 Modal Creazione/Modifica Codice
```tsx
<ModalCodiceSconto>
  <Tabs>
    {/* Tab 1: Informazioni Base */}
    <TabGenerali>
      <Input name="codice" label="Codice" required />
      <Input name="nome" label="Nome" required />
      <Textarea name="descrizione" label="Descrizione" />
      
      <RadioGroup name="tipoSconto" label="Tipo Sconto">
        <Radio value="PERCENTUALE">Percentuale (%)</Radio>
        <Radio value="VALORE_ASSOLUTO">Valore Fisso (€)</Radio>
      </RadioGroup>
      
      <Input 
        name="valore" 
        label={tipoSconto === 'PERCENTUALE' ? 'Percentuale' : 'Importo (€)'} 
        type="number"
        required 
      />
    </TabGenerali>
    
    {/* Tab 2: Validità */}
    <TabValidita>
      <DatePicker name="dataInizio" label="Data Inizio" required />
      <DatePicker name="dataFine" label="Data Fine" required />
      <Toggle name="attivo" label="Attivo" />
      
      <Input name="utilizzoMassimo" label="Utilizzi Massimi" type="number" />
      <Input name="utilizzoPerUtente" label="Utilizzi per Utente" type="number" />
    </TabValidita>
    
    {/* Tab 3: Restrizioni */}
    <TabRestrizioni>
      <Toggle name="cumulabile" label="Cumulabile con altri sconti" />
      <Input name="minImporto" label="Importo Minimo (€)" type="number" />
      <Input name="maxImporto" label="Sconto Massimo (€)" type="number" />
      
      <RadioGroup name="applicabileA" label="Applicabile a">
        <Radio value="TUTTI">Tutti</Radio>
        <Radio value="AZIENDE">Solo Aziende Specifiche</Radio>
        <Radio value="PERSONE">Solo Persone Specifiche</Radio>
      </RadioGroup>
      
      {applicabileA === 'AZIENDE' && (
        <MultiSelect
          name="aziende"
          label="Aziende Autorizzate"
          options={companies}
        />
      )}
      
      {applicabileA === 'PERSONE' && (
        <MultiSelect
          name="persone"
          label="Persone Autorizzate"
          options={persons}
        />
      )}
    </TabRestrizioni>
    
    {/* Tab 4: Corsi Applicabili */}
    <TabCorsi>
      <RadioGroup name="tipoCorso" label="Corsi Applicabili">
        <Radio value="TUTTI">Tutti i Corsi</Radio>
        <Radio value="SPECIFICI">Solo Corsi Specifici</Radio>
      </RadioGroup>
      
      {tipoCorso === 'SPECIFICI' && (
        <MultiSelect
          name="corsiApplicabili"
          label="Seleziona Corsi"
          options={courses}
        />
      )}
      
      <MultiSelect
        name="categorieCorso"
        label="Categorie Corso"
        options={courseCategories}
      />
    </TabCorsi>
  </Tabs>
</ModalCodiceSconto>
```

### 5. Template PDF Preventivo

#### 5.1 Design Template
```
┌────────────────────────────────────────────────────────┐
│ [LOGO AZIENDA]                    PREVENTIVO N. {{NUM}}│
│                                           Data: {{DATA}}│
├────────────────────────────────────────────────────────┤
│                                                         │
│ CLIENTE                                                 │
│ {{CLIENTE_NOME}}                                        │
│ {{CLIENTE_INDIRIZZO}}                                   │
│ P.IVA: {{CLIENTE_PIVA}}                                │
│ Email: {{CLIENTE_EMAIL}}                                │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│ CORSO DI FORMAZIONE                                     │
│                                                         │
│ Titolo: {{CORSO_TITOLO}}                                │
│ Durata: {{CORSO_DURATA}} ore                            │
│ Partecipanti: {{NUM_PARTECIPANTI}}                      │
│ Modalità: {{MODALITA_EROGAZIONE}}                       │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│ DETTAGLIO PREZZI                                        │
│                                                         │
│ Prezzo unitario per partecipante:    €{{PREZZO_UNIT}}  │
│ Numero partecipanti:                    {{NUM_PART}}    │
│                                        ────────────────  │
│ Totale base:                          €{{TOTALE_BASE}} │
│                                                         │
│ {{#if SCONTI}}                                          │
│ Sconti applicati:                                       │
│ {{#each SCONTI}}                                        │
│   - {{CODICE}}: {{DESCRIZIONE}}    -€{{VALORE}}        │
│ {{/each}}                                               │
│                                        ────────────────  │
│ Totale sconti:                       -€{{TOT_SCONTI}}  │
│ {{/if}}                                                 │
│                                        ════════════════  │
│ TOTALE FINALE:                        €{{IMPORTO_FIN}} │
│                                        ════════════════  │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│ CONDIZIONI                                              │
│ - Validità preventivo: {{SCADENZA}}                     │
│ - Pagamento: {{CONDIZIONI_PAGAMENTO}}                   │
│ - {{NOTE_AGGIUNTIVE}}                                   │
│                                                         │
├────────────────────────────────────────────────────────┤
│                                                         │
│ Per accettare questo preventivo, rispondere via email  │
│ o utilizzare il link: {{LINK_ACCETTAZIONE}}            │
│                                                         │
│              [FIRMA DIGITALE AZIENDA]                   │
└────────────────────────────────────────────────────────┘
```

#### 5.2 Marker Template
```typescript
const PREVENTIVO_MARKERS = {
  // Header
  NUM: preventivo.numero,
  DATA: formatDate(preventivo.dataEmissione),
  
  // Cliente
  CLIENTE_NOME: cliente.ragioneSociale || `${cliente.firstName} ${cliente.lastName}`,
  CLIENTE_INDIRIZZO: cliente.indirizzo,
  CLIENTE_PIVA: cliente.piva,
  CLIENTE_EMAIL: cliente.email,
  
  // Corso
  CORSO_TITOLO: corso.title,
  CORSO_DURATA: corso.duration,
  NUM_PARTECIPANTI: preventivo.numeroPartecipanti,
  MODALITA_EROGAZIONE: corso.deliveryMode,
  
  // Prezzi
  PREZZO_UNIT: formatCurrency(preventivo.prezzoUnitario),
  NUM_PART: preventivo.numeroPartecipanti,
  TOTALE_BASE: formatCurrency(preventivo.prezzoTotale),
  
  // Sconti
  SCONTI: preventivo.codiciScontoApplicati.map(s => ({
    CODICE: s.codice,
    DESCRIZIONE: s.descrizione,
    VALORE: formatCurrency(s.valore)
  })),
  TOT_SCONTI: formatCurrency(preventivo.scontoTotale),
  
  // Finale
  IMPORTO_FIN: formatCurrency(preventivo.importoFinale),
  
  // Condizioni
  SCADENZA: formatDate(preventivo.dataScadenza),
  CONDIZIONI_PAGAMENTO: preventivo.condizioniPagamento,
  NOTE_AGGIUNTIVE: preventivo.note,
  
  // Link accettazione
  LINK_ACCETTAZIONE: `${BASE_URL}/preventivi/${preventivo.id}/accetta`
};
```

---

## 🔒 Requisiti Non Funzionali

### 1. Conformità GDPR
- ✅ Audit trail per tutte le operazioni
- ✅ Consenso GDPR per dati personali
- ✅ Soft delete per tutti i dati
- ✅ Export dati utente
- ✅ Anonimizzazione dopo cancellazione

### 2. Sicurezza
- ✅ Autenticazione JWT per tutte le API
- ✅ Autorizzazione basata su ruoli
- ✅ Validazione input lato server e client
- ✅ Rate limiting su API pubbliche
- ✅ Protezione CSRF

### 3. Performance
- ✅ Cache redis per codici sconto frequenti
- ✅ Pagination su liste codici/preventivi
- ✅ Lazy loading componenti
- ✅ Debounce su ricerca codici
- ✅ Ottimizzazione query database

### 4. Usabilità
- ✅ Interfaccia responsive (mobile-first)
- ✅ Feedback immediato azioni utente
- ✅ Validazione real-time form
- ✅ Messaggi errore chiari in italiano
- ✅ Help tooltips contestuali

### 5. Manutenibilità
- ✅ Codice modulare e testabile
- ✅ Documentazione inline
- ✅ TypeScript strict mode
- ✅ Unit test coverage > 80%
- ✅ E2E test per flussi critici

---

## 📐 Vincoli Tecnici

### 1. Architettura
- ✅ Backend Node.js + Express + Prisma ESM
- ✅ Frontend React 18 + TypeScript + Vite
- ✅ Database PostgreSQL
- ✅ Multi-tenancy obbligatorio

### 2. Porte Fisse (NON MODIFICARE)
- API Server: **4001**
- Proxy Server: **4003**
- Frontend: **5173**

### 3. Compatibilità
- ✅ Funzionamento localhost
- ✅ Funzionamento Hetzner + Supabase
- ✅ Configurazione via variabili ambiente
- ❌ NO hard-coding valori

### 4. Standard Codice
- ✅ File max 500 righe
- ✅ Funzioni max 50 righe
- ✅ Naming italiano per UI
- ✅ Naming inglese per codice
- ✅ Commenti in italiano

---

## 🚫 Esclusioni Scope

### Fuori Ambito v1.0
- ❌ Pagamenti online integrati (Stripe, PayPal)
- ❌ Firma digitale contratti
- ❌ Notifiche push mobile
- ❌ Export Excel preventivi
- ❌ Dashboard analytics avanzata
- ❌ API pubblica per terze parti

---

## 📊 Metriche di Successo

### KPI Tecnici
- ⏱️ Tempo generazione preventivo < 2s
- ⏱️ Validazione codice sconto < 500ms
- ⏱️ Rendering PDF < 3s
- 📈 Uptime sistema > 99%
- 🧪 Test coverage > 80%

### KPI Funzionali
- ✅ Creazione preventivo in < 5 click
- ✅ Applicazione sconto in < 3 click
- ✅ Tasso errore utente < 5%
- ✅ Tempo apprendimento < 10 min

---

## 🔍 Analisi Rischi

### Rischi Tecnici
| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Performance PDF lenti | Media | Alto | Cache template, worker asincroni |
| Calcolo sconto errato | Bassa | Critico | Unit test estensivi, validazione doppia |
| Integrazione Step 4 complessa | Media | Medio | Refactoring graduale, feature flag |
| Database deadlock | Bassa | Alto | Transaction isolation, retry logic |

### Rischi Funzionali
| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| UX troppo complessa | Media | Alto | User testing, iterazioni UI |
| Abuso codici sconto | Media | Medio | Rate limiting, validazione server |
| Template PDF non professionale | Bassa | Alto | Designer esterno, review clienti |
| Conflitti codici cumulabili | Media | Medio | Logica precedenza chiara, test |

---

## 📅 Stima Temporale Preliminare

### Fase 1: Foundation (5-7 giorni)
- Database schema + migrations
- API backend base
- Servizi business logic

### Fase 2: UI Amministrazione (4-6 giorni)
- Pagina gestione codici sconto
- Modal creazione/modifica
- Validazioni e feedback

### Fase 3: Integrazione Step 4 (6-8 giorni)
- Componente Step Preventivo
- Logica calcolo sconti
- Validazioni real-time

### Fase 4: Template e PDF (3-5 giorni)
- Design template preventivo
- Integrazione Google Slides
- Generazione e download PDF

### Fase 5: Testing e Refinement (4-6 giorni)
- Unit tests
- Integration tests
- E2E tests
- Bug fixing

### Fase 6: Documentazione (2-3 giorni)
- Documentazione tecnica
- Documentazione utente
- Video tutorial

**TOTALE STIMATO: 24-35 giorni lavorativi**

---

## ✅ Criteri di Accettazione

### Must Have (v1.0)
- ✅ Creazione codici sconto con tutte le configurazioni
- ✅ Validazione codici in Step 4
- ✅ Calcolo automatico prezzi e sconti
- ✅ Generazione PDF preventivo elegante
- ✅ Salvataggio preventivi in database
- ✅ Lista e gestione codici sconto (admin)
- ✅ Conformità GDPR completa

### Should Have (v1.1)
- 📧 Invio email preventivo automatico
- 📊 Dashboard statistiche codici sconto
- 🔔 Notifiche scadenza preventivi
- 📱 UI mobile ottimizzata

### Could Have (v2.0)
- 💳 Integrazione pagamento online
- ✍️ Firma digitale accettazione
- 📈 Analytics avanzate utilizzo sconti
- 🌍 Multi-lingua

### Won't Have (v1.0)
- ❌ Marketplace corsi pubblico
- ❌ App mobile nativa
- ❌ AI suggerimento prezzi
- ❌ Blockchain tracking

---

## 📝 Note Finali

### Principi Guida
1. **Semplicità**: UI intuitiva, flusso lineare
2. **Affidabilità**: Validazioni robuste, errori gestiti
3. **Performance**: Operazioni rapide, feedback immediato
4. **Conformità**: GDPR sempre rispettato
5. **Manutenibilità**: Codice pulito, documentato, testato

### Prossimi Passi
1. ✅ Review analisi requisiti con stakeholder
2. 🔄 Planning dettagliato architettura
3. 🔄 Design database schema
4. 🔄 Prototipo UI principale
5. 🔄 Setup ambiente sviluppo

---

**Documento redatto in conformità a**:
- `/Users/matteo.michielon/project 2.0/.trae/rules/project_rules.md`
- `/Users/matteo.michielon/project 2.0/.trae/TRAE_SYSTEM_GUIDE.md`
- Regolamento GDPR (UE) 2016/679
