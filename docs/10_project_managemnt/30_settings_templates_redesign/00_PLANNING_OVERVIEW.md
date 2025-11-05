# Planning Ristrutturazione Pagina Settings/Templates

**Data Inizio**: 5 Novembre 2025  
**Priorità**: Alta  
**Tipologia**: Feature Enhancement + UI/UX Redesign  
**Riferimenti**: docs/10_project_managemnt/29_template/

---

## 🎯 Obiettivi del Progetto

### Obiettivo Principale
Ristrutturare completamente la pagina `/settings/templates` per fornire un'esperienza completa di gestione template con editor in-app, import da Google Workspace e preview in real-time.

### Obiettivi Specifici

1. **Editor In-App Avanzato**
   - Editor visuale con WYSIWYG (Tiptap/Quill)
   - Configurazione layout: orientamento pagina (portrait/landscape), margini personalizzati
   - Gestione header/footer con possibilità di inserimento logo
   - Numerazione pagina automatica
   - Builder CSS intuitivo per stili (font, colori, spaziature)
   - Sistema drag & drop per elementi grafici

2. **Import da Google Workspace**
   - Integrazione Google Docs API (già presente in `backend/services/google-api.js`)
   - Integrazione Google Slides API per template grafici
   - OAuth2 flow per autorizzazione utente
   - Conversione automatica HTML da Google Docs
   - Sync opzionale per aggiornamenti template

3. **Sistema Marker Avanzato**
   - Auto-completion intelligente con popup contestuale
   - Validazione marker in real-time
   - Preview live con dati mock
   - Documentazione marker integrata
   - Supporto formatter (date, uppercase, currency, etc.)

4. **Gestione Template Completa**
   - Lista template con filtri avanzati (tipo, categoria, stato)
   - Versionamento con storico modifiche
   - Duplicazione template
   - Import/export template JSON
   - Template predefiniti per ogni tipo documento

5. **User Experience Ottimizzata**
   - UI moderna e intuitiva per utenti non tecnici
   - Onboarding guidato per creazione primo template
   - Help contestuale e tooltips
   - Preview PDF in real-time durante editing
   - Responsive design per tablet

---

## 📋 Scope del Progetto

### ✅ In Scope

**Gestione Template**
- ✅ CRUD completo template (Create, Read, Update, Delete)
- ✅ Versionamento automatico con storico
- ✅ Duplicazione e clonazione template
- ✅ Import/export template in formato JSON
- ✅ Categorie e tag per organizzazione
- ✅ Template predefiniti per ogni tipo documento

**Editor In-App**
- ✅ WYSIWYG editor con Tiptap v2
- ✅ Configurazione layout pagina
  - Orientamento: portrait/landscape
  - Dimensioni: A4, A3, Letter, Custom
  - Margini personalizzati (top, right, bottom, left)
- ✅ Header/Footer editor separato
  - Testo personalizzato
  - Inserimento logo (upload + posizionamento)
  - Numerazione pagina con variabili: `{{page}}`, `{{totalPages}}`
- ✅ CSS Builder visuale
  - Font family, size, weight
  - Colori testo/sfondo
  - Line height, spacing
  - Allineamento testo
- ✅ Toolbar formattazione ricco
  - Bold, italic, underline
  - Liste (ordered/unordered)
  - Tabelle
  - Immagini

**Sistema Marker**
- ✅ Marker picker con ricerca e filtri
- ✅ Auto-completion intelligente
- ✅ Preview marker con dati mock
- ✅ Validazione marker in tempo reale
- ✅ Documentazione marker integrata (65 marker disponibili)
- ✅ Formatter supportati: date, uppercase, lowercase, currency, truncate, etc.

**Integrazione Google Workspace**
- ✅ OAuth2 flow per Google Account
- ✅ Import da Google Docs tramite URL o ID documento
- ✅ Import da Google Slides per layout grafici
- ✅ Conversione automatica in HTML
- ✅ Preservazione formattazione base (font, colori, struttura)
- ✅ Gestione permessi documento (read-only access required)

**Tipi Documento Supportati**
- ✅ Lettere di Incarico (`LETTER_OF_ENGAGEMENT`)
- ✅ Registri Presenze (`ATTENDANCE_REGISTER`)
- ✅ Attestati Partecipanti (`CERTIFICATE`)
- ✅ Fatture (`INVOICE`)
- ✅ Programmi Corso (`COURSE_PROGRAM`)
- ✅ Template Custom (`CUSTOM`)

**Preview e Testing**
- ✅ Preview PDF in real-time con dati mock
- ✅ Test generation con dati reali da database
- ✅ Validazione marker prima del salvataggio
- ✅ Preview responsive (desktop, tablet)

### ❌ Out of Scope (Futuro)

- ❌ Editor collaborativo multi-utente in tempo reale
- ❌ Firma digitale avanzata (PAdES/CAdES)
- ❌ OCR per import template scannerizzati
- ❌ Integrazione Microsoft Word Online
- ❌ Versioning avanzato con diff visualization
- ❌ Export template in formati diversi da JSON/HTML
- ❌ Template marketplace/sharing tra tenant
- ❌ AI-powered template suggestions

---

## 🏗️ Architettura Tecnica

### Stack Tecnologico

#### Frontend
```typescript
- React 18 + TypeScript
- Editor: Tiptap v2 (estensibile, React-friendly)
- PDF Preview: react-pdf + pdf.js
- Drag & Drop: react-beautiful-dnd / @dnd-kit
- Forms: React Hook Form + Zod validation
- State Management: Context API + React Query
- UI Components: Shadcn/ui + Tailwind CSS
- Color Picker: react-color / react-colorful
- Code Editor (markers): CodeMirror 6
```

#### Backend
```javascript
- Node.js + Express (api-server porta 4001)
- PDF Generation: Puppeteer (HTML → PDF)
- Google APIs: googleapis ^150.x
- Template Storage: PostgreSQL (Prisma ORM)
- File Storage: Local uploads/ + S3 (opzionale)
- Queue: Bull + Redis (per batch generation)
- Cache: Redis (per preview e rendering)
```

#### Database
```prisma
- PostgreSQL 14+
- Models:
  - TemplateLink (enhanced)
  - TemplateVersion (new)
  - GeneratedDocument (new)
- Multi-tenancy: tenantId su tutti i model
- Soft delete: deletedAt timestamps
```

#### Integrations
```
- Google Docs API v1 (read + export)
- Google Slides API v1 (read + export)
- Google Drive API v3 (file listing)
- OAuth2 flow: Authorization Code with PKCE
```

### Componenti Principali

```
src/pages/settings/templates/
├── TemplatesPage.tsx              # Main page con lista template
├── TemplateEditor.tsx              # Editor completo template
├── components/
│   ├── TemplateList.tsx           # Lista con filtri e ricerca
│   ├── TemplateCard.tsx           # Card singolo template
│   ├── TemplateFilters.tsx        # Filtri avanzati
│   ├── editor/
│   │   ├── TiptapEditor.tsx       # Editor WYSIWYG principale
│   │   ├── EditorToolbar.tsx      # Toolbar formattazione
│   │   ├── HeaderFooterEditor.tsx # Editor header/footer
│   │   ├── LayoutConfig.tsx       # Config layout pagina
│   │   ├── StylesPanel.tsx        # Panel stili CSS
│   │   ├── MarkerPicker.tsx       # Picker marker con search
│   │   ├── LogoUploader.tsx       # Upload e posizionamento logo
│   │   └── PageConfig.tsx         # Config margini/orientamento
│   ├── preview/
│   │   ├── PreviewPanel.tsx       # Preview live PDF
│   │   ├── PreviewToolbar.tsx     # Toolbar preview (zoom, page)
│   │   └── MockDataSelector.tsx   # Selector dati mock
│   ├── google/
│   │   ├── GoogleImportModal.tsx  # Modal import Google
│   │   ├── GoogleDocsImporter.tsx # Import da Docs
│   │   ├── GoogleSlidesImporter.tsx # Import da Slides
│   │   └── GoogleAuthButton.tsx   # OAuth2 authorization
│   └── version/
│       ├── VersionHistory.tsx     # Storico versioni
│       └── VersionCompare.tsx     # Confronto versioni
└── hooks/
    ├── useTemplateEditor.ts       # Hook editor state
    ├── useMarkerValidation.ts     # Hook validazione marker
    ├── useGoogleImport.ts         # Hook import Google
    └── useTemplatePreview.ts      # Hook preview PDF
```

---

## 📊 Schema Database (Estensioni)

### TemplateLink (Enhanced)

```prisma
model TemplateLink {
  id                String              @id @default(uuid())
  name              String              // Nome template
  type              TemplateType        // Tipo documento
  fileFormat        TemplateFormat?     // Formato sorgente (HTML, DOCX, GOOGLE_DOCS)
  
  // Contenuto
  content           String?             @db.Text  // HTML principale
  header            String?             @db.Text  // Header HTML
  footer            String?             @db.Text  // Footer HTML
  
  // Layout & Styling
  styles            Json?               // { fontSize: "12px", fontFamily: "Arial", ... }
  layout            Json?               // { pageSize: "A4", orientation: "portrait", margins: {...} }
  
  // Logo e Immagini
  logoImage         String?             // Base64 o URL logo
  logoPosition      String?             // "header-left" | "header-center" | "header-right"
  logoWidth         Int?                // Larghezza logo in px
  logoHeight        Int?                // Altezza logo in px
  
  // Marker Configuration
  markers           Json?               // Array marker disponibili
  markerSchema      Json?               // Schema validazione marker
  
  // Google Integration
  googleDocsUrl     String?             // URL documento Google
  googleDocsId      String?             // ID documento Google
  lastSyncAt        DateTime?           // Ultima sincronizzazione
  autoSync          Boolean             @default(false)
  
  // Metadata
  version           Int                 @default(1)
  isActive          Boolean             @default(true)
  isDefault         Boolean             @default(false)
  category          String?             // Categoria template
  tags              String[]            @default([])
  description       String?             @db.Text
  
  // Multi-tenancy & Permissions
  tenantId          String
  createdBy         String
  
  // Timestamps
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  deletedAt         DateTime?
  
  // Relations
  tenant            Tenant              @relation(fields: [tenantId], references: [id])
  creator           Person              @relation(fields: [createdBy], references: [id])
  versions          TemplateVersion[]
  generatedDocs     GeneratedDocument[]
  
  @@index([tenantId, type, isActive])
  @@index([tenantId, isDefault])
  @@index([googleDocsId])
}
```

### TemplateVersion (New)

```prisma
model TemplateVersion {
  id                String              @id @default(uuid())
  templateId        String
  version           Int
  
  // Snapshot completo del template
  content           String              @db.Text
  header            String?             @db.Text
  footer            String?             @db.Text
  styles            Json?
  layout            Json?
  logoImage         String?
  
  // Metadata versione
  changesSummary    String?             @db.Text
  changedFields     String[]            @default([])
  
  // Multi-tenancy
  tenantId          String
  createdBy         String
  createdAt         DateTime            @default(now())
  
  // Relations
  template          TemplateLink        @relation(fields: [templateId], references: [id])
  tenant            Tenant              @relation(fields: [tenantId], references: [id])
  creator           Person              @relation(fields: [createdBy], references: [id])
  
  @@unique([templateId, version])
  @@index([templateId])
}
```

### Enums

```prisma
enum TemplateType {
  LETTER_OF_ENGAGEMENT    // Lettera di Incarico
  ATTENDANCE_REGISTER     // Registro Presenze
  CERTIFICATE            // Attestato
  INVOICE                // Fattura
  COURSE_PROGRAM         // Programma Corso
  CUSTOM                 // Template personalizzato
}

enum TemplateFormat {
  HTML              // HTML con CSS inline
  DOCX              // Microsoft Word (import only)
  GOOGLE_DOCS       // Google Docs (import only)
  GOOGLE_SLIDES     // Google Slides (import only)
}
```

---

## 🔌 API Endpoints (Nuovi/Modificati)

### Template Management

```http
# Lista template con filtri avanzati
GET /api/v1/templates
Query: ?type=CERTIFICATE&isActive=true&category=Sicurezza&search=antincendio&page=1&limit=20

# Dettaglio template con versioni
GET /api/v1/templates/:id
Include: versions (last 10), generatedDocsCount, creator info

# Crea nuovo template
POST /api/v1/templates
Body: { name, type, content, header, footer, styles, layout, markers, ... }

# Aggiorna template (crea nuova versione)
PUT /api/v1/templates/:id
Body: { content?, header?, styles?, ... }
Auto-creates: new TemplateVersion

# Elimina template (soft delete)
DELETE /api/v1/templates/:id
Sets: deletedAt timestamp

# Duplica template
POST /api/v1/templates/:id/duplicate
Body: { newName }
Returns: new template with copied content

# Storico versioni
GET /api/v1/templates/:id/versions
Returns: array of TemplateVersion

# Ripristina versione
POST /api/v1/templates/:id/restore/:versionId
Creates: new version with old content
```

### Preview & Validation

```http
# Preview PDF con dati mock
POST /api/v1/templates/:id/preview
Body: { mockData: { person: {...}, course: {...} } }
Returns: PDF blob

# Validazione marker
POST /api/v1/templates/:id/validate
Body: { content, markers }
Returns: { valid: boolean, errors: [...] }

# Test generation con dati reali
POST /api/v1/templates/:id/test-generate
Body: { scheduleId, personId }
Returns: PDF blob
```

### Google Integration

```http
# OAuth2 authorization URL
GET /api/v1/google/auth-url
Returns: { authUrl: "https://accounts.google.com/o/oauth2/..." }

# OAuth2 callback
GET /api/v1/google/callback
Query: ?code=...&state=...
Returns: { success: true, tokens: {...} }

# Import da Google Docs
POST /api/v1/templates/import/google-docs
Body: { documentUrl: "https://docs.google.com/document/d/...", name, type }
Returns: { template: {...}, preview: "..." }

# Import da Google Slides
POST /api/v1/templates/import/google-slides
Body: { presentationUrl: "https://docs.google.com/presentation/d/...", name, type }
Returns: { template: {...}, preview: "..." }

# Sync template da Google
POST /api/v1/templates/:id/sync-google
Fetches: latest content from googleDocsUrl
Creates: new version if changed
```

### Marker Utilities

```http
# Lista marker disponibili per tipo template
GET /api/v1/markers?type=CERTIFICATE
Returns: { markers: [...], categories: [...], formatters: [...] }

# Valida sintassi marker
POST /api/v1/markers/validate
Body: { marker: "{{person.fullName|uppercase}}" }
Returns: { valid: true, parsed: {...} }

# Mock data per preview
GET /api/v1/markers/mock-data?type=CERTIFICATE
Returns: { person: {...}, course: {...}, schedule: {...}, ... }
```

---

## 📅 Timeline Implementazione

### **Fase 1: Setup & Infrastructure** (2-3 giorni)

#### Giorno 1: Database Migration
- [ ] Crea migration Prisma per campi nuovi `TemplateLink`
- [ ] Crea model `TemplateVersion`
- [ ] Aggiungi enums `TemplateType`, `TemplateFormat`
- [ ] Testa migration su DB locale
- [ ] Backup dati esistenti

#### Giorno 2-3: Backend API Base
- [ ] Implementa CRUD endpoints `/api/v1/templates`
- [ ] Logica versionamento automatico
- [ ] Endpoint duplicazione template
- [ ] Endpoint validazione marker
- [ ] Test API con Postman/Insomnia

**Deliverable**: API backend funzionante, database migrato

---

### **Fase 2: Editor Base** (4-5 giorni)

#### Giorno 4-5: Tiptap Editor Setup
- [ ] Setup Tiptap v2 con estensioni base
- [ ] Toolbar formattazione (bold, italic, lists, tables)
- [ ] Integrazione marker picker button
- [ ] Auto-save draft ogni 30 secondi
- [ ] Layout responsive editor

#### Giorno 6: Layout & Style Configuration
- [ ] Component `LayoutConfig.tsx`
  - Select orientamento (portrait/landscape)
  - Select dimensione pagina (A4, A3, Letter, Custom)
  - Input margini (top, right, bottom, left)
- [ ] Component `StylesPanel.tsx`
  - Font family selector
  - Font size slider
  - Color pickers (testo, sfondo)
  - Line height, letter spacing
- [ ] Preview in real-time delle modifiche

#### Giorno 7-8: Header/Footer Editor
- [ ] Component `HeaderFooterEditor.tsx`
- [ ] Editor separato per header/footer
- [ ] Supporto variabili: `{{page}}`, `{{totalPages}}`, `{{current.date}}`
- [ ] Component `LogoUploader.tsx`
  - Upload logo (max 2MB, PNG/JPG)
  - Posizionamento (left/center/right)
  - Resize con anteprima
- [ ] Preview header/footer in editor principale

**Deliverable**: Editor WYSIWYG funzionante con configurazione layout

---

### **Fase 3: Sistema Marker** (3-4 giorni)

#### Giorno 9-10: Marker Picker
- [ ] Component `MarkerPicker.tsx`
- [ ] Modal con lista marker categorizzati
- [ ] Ricerca e filtri (per categoria, tipo)
- [ ] Preview marker con tooltip descrittivo
- [ ] Inserimento marker con click
- [ ] Auto-completion trigger: `{{` in editor

#### Giorno 11-12: Validazione & Preview
- [ ] Hook `useMarkerValidation.ts`
- [ ] Validazione real-time marker in editor
- [ ] Highlight marker validi/invalidi
- [ ] Component `MockDataSelector.tsx`
- [ ] API endpoint per mock data
- [ ] Preview PDF con dati mock

**Deliverable**: Sistema marker completo con validazione e preview

---

### **Fase 4: Google Integration** (4-5 giorni)

#### Giorno 13-14: OAuth2 Setup
- [ ] Configura Google Cloud Console
  - Crea OAuth2 credentials
  - Configura redirect URI
  - Abilita APIs (Docs, Slides, Drive)
- [ ] Backend: OAuth2 flow handlers
- [ ] Component `GoogleAuthButton.tsx`
- [ ] Store tokens in session/localStorage

#### Giorno 15-16: Import Google Docs
- [ ] Component `GoogleDocsImporter.tsx`
- [ ] Input URL documento Google Docs
- [ ] Fetch documento via API
- [ ] Conversione HTML (mantieni formattazione base)
- [ ] Preview imported content
- [ ] Salva come nuovo template

#### Giorno 17: Import Google Slides
- [ ] Component `GoogleSlidesImporter.tsx`
- [ ] Fetch presentazione via API
- [ ] Estrai layout prima slide
- [ ] Converti immagini/testo in HTML
- [ ] Preview e salvataggio

**Deliverable**: Integrazione Google Workspace funzionante

---

### **Fase 5: Lista Template & UI** (3 giorni)

#### Giorno 18-19: Template List
- [ ] Component `TemplateList.tsx`
- [ ] Card template con anteprima
- [ ] Filtri avanzati (tipo, categoria, stato)
- [ ] Ricerca full-text
- [ ] Paginazione
- [ ] Azioni: edit, duplicate, delete, set default

#### Giorno 20: Template Detail & Versioning
- [ ] Component `VersionHistory.tsx`
- [ ] Lista versioni con data/autore
- [ ] Ripristina versione precedente
- [ ] Component `VersionCompare.tsx` (basic)

**Deliverable**: UI completa lista e gestione template

---

### **Fase 6: Testing & Polish** (3-4 giorni)

#### Giorno 21-22: Testing E2E
- [ ] Test creazione template da zero
- [ ] Test import da Google Docs
- [ ] Test preview PDF
- [ ] Test generazione documenti reali
- [ ] Test versionamento
- [ ] Test duplicazione

#### Giorno 23: Bug Fixes & Optimization
- [ ] Fix bug trovati in testing
- [ ] Ottimizzazione performance editor
- [ ] Lazy loading componenti pesanti
- [ ] Caching preview PDF

#### Giorno 24: Documentation
- [ ] Documentazione utente (screenshot, video)
- [ ] Documentazione tecnica (API, componenti)
- [ ] Migration guide da vecchia pagina

**Deliverable**: Sistema completo testato e documentato

---

## 🚀 Rollout Strategy

### Fase Alpha (Giorno 25)
- Deploy su ambiente staging
- Test con 2-3 utenti interni
- Raccolta feedback

### Fase Beta (Giorno 26-27)
- Deploy su ambiente pre-produzione
- Test con 10-15 utenti selezionati
- Raccolta feedback e bug reports

### Fase Production (Giorno 28)
- Deploy su produzione
- Migrazione dati template esistenti
- Comunicazione a tutti gli utenti
- Monitoraggio errori (Sentry)

---

## 🔧 Configurazione Porte (Non Negoziabili)

```yaml
Frontend: 5173 (Vite dev server)
API Server: 4001 (Express)
Document Server: 4002 (PDF generation)
Proxy Server: 4003 (Nginx/Express proxy)
Redis: 6379 (Cache & Queue)
PostgreSQL: 5432 (Database)
```

---

## 📋 Checklist Pre-Implementation

### Setup Locale
- [ ] Verificare `backend/services/google-api.js` funzionante
- [ ] Verificare credenziali Google in `config/google-service-account.json`
- [ ] Redis installato e attivo (`redis-cli ping`)
- [ ] PostgreSQL attivo con database aggiornato
- [ ] Node.js v24.2.0 (come richiesto)
- [ ] Dipendenze installate: `googleapis`, `tiptap`, `react-pdf`

### Ambiente Sviluppo
- [ ] Branch git: `feature/settings-templates-redesign`
- [ ] Setup ESLint e Prettier
- [ ] Setup Storybook per componenti (opzionale)
- [ ] Setup test environment (Jest + React Testing Library)

### Credenziali Test
- [ ] Admin locale: `admin@example.com` / `Admin123!`
- [ ] Token Google test per import
- [ ] Documento Google Docs test pubblico

---

## 🎯 Success Metrics

### Funzionali
- ✅ Utente può creare template da zero in < 5 minuti
- ✅ Import da Google Docs funziona in < 30 secondi
- ✅ Preview PDF genera in < 3 secondi
- ✅ Marker validation real-time senza lag
- ✅ Editor supporta template fino a 50 pagine

### Performance
- ✅ Caricamento pagina lista template: < 1s
- ✅ Apertura editor: < 2s
- ✅ Auto-save draft: < 500ms
- ✅ Preview PDF generation: < 3s
- ✅ Import Google Docs: < 30s

### User Experience
- ✅ 90% utenti completano onboarding senza supporto
- ✅ 0 errori critici in prima settimana
- ✅ Feedback utenti: >= 4/5 stars
- ✅ Supporto mobile/tablet (responsive)

---

## 🔐 GDPR & Security

### Data Privacy
- [ ] Template content non contiene dati personali diretti
- [ ] Marker resolution solo in fase generation (non storage)
- [ ] Audit log per creazione/modifica template
- [ ] Soft delete template (no hard delete)

### Multi-Tenancy
- [ ] Tutti i template filtrati per `tenantId`
- [ ] Impossibile accedere template di altri tenant
- [ ] Default template replicati per nuovo tenant

### Google OAuth
- [ ] Tokens Google criptati in storage
- [ ] Refresh token automatico
- [ ] Revoke token su logout
- [ ] Scope minimi necessari (read-only)

---

## 📚 Riferimenti Tecnici

### Documentazione Esistente
- `docs/10_project_managemnt/29_template/` - Sistema template completo
- `backend/services/google-api.js` - Google APIs service
- `src/pages/settings/Templates.tsx` - Pagina corrente

### Dependencies
```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-table": "^2.x",
  "react-pdf": "^7.x",
  "googleapis": "^150.x",
  "react-colorful": "^5.x",
  "react-beautiful-dnd": "^13.x",
  "puppeteer": "^21.x"
}
```

### API Esterne
- Google Docs API v1: https://developers.google.com/docs/api
- Google Slides API v1: https://developers.google.com/slides/api
- Google Drive API v3: https://developers.google.com/drive/api

---

## 🎨 UI/UX Design Principles

### Layout Pagina
```
┌─────────────────────────────────────────────────────────────┐
│ Settings / Templates                         [+ Nuovo]      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ [Filtri: Tipo ▼] [Categoria ▼] [Stato ▼]  [🔍 Cerca...]    │
│                                                               │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ Attestato   │ │ Lettera     │ │ Registro    │            │
│ │ Sicurezza   │ │ Incarico    │ │ Presenze    │            │
│ │             │ │             │ │             │            │
│ │ [Preview]   │ │ [Preview]   │ │ [Preview]   │            │
│ │             │ │             │ │             │            │
│ │ ✏️ Modifica  │ │ ✏️ Modifica  │ │ ✏️ Modifica  │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Layout Editor
```
┌─────────────────────────────────────────────────────────────┐
│ ← Indietro  |  Attestato Sicurezza v3      [💾 Salva] [👁️ Preview] │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│ 📄 Layout    │  ┌────────────────────────┐  │  📋 Marker    │
│   - A4       │  │ Header (Logo + Testo)  │  │   🔍 Cerca..  │
│   - Portrait │  └────────────────────────┘  │   📦 Person   │
│   - Margini  │                              │   📦 Course   │
│              │  [Editor WYSIWYG]            │   📦 Schedule │
│ 🎨 Stili     │   Rich text toolbar          │               │
│   - Font     │   {{marker}} suggestions     │  Click per    │
│   - Colori   │   Auto-completion            │  inserire     │
│   - Spacing  │                              │               │
│              │  ┌────────────────────────┐  │               │
│ 📸 Logo      │  │ Footer (Numerazione)   │  │               │
│   - Upload   │  └────────────────────────┘  │               │
│   - Position │                              │               │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
```

### Color Palette
```css
Primary: #4F46E5 (Indigo)
Secondary: #10B981 (Green)
Accent: #F59E0B (Amber)
Neutral: #6B7280 (Gray)
Error: #EF4444 (Red)
Success: #10B981 (Green)
```

---

## 📝 Note Implementative

### Priorità Features
1. **Must Have** (Fase 1-3): CRUD template, editor base, marker system
2. **Should Have** (Fase 4-5): Google integration, versioning, UI avanzata
3. **Nice to Have** (Post-launch): Template marketplace, AI suggestions, collaborative editing

### Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Google OAuth setup complesso | Media | Alto | Usare service account per testing, OAuth2 per produzione |
| Performance editor con template grandi | Media | Medio | Lazy loading, debounce auto-save, virtualization |
| Conversione Google Docs perde formattazione | Alta | Medio | Avvisare utente di controllare preview, permettere edit post-import |
| Marker validation lenta | Bassa | Medio | Cache validation results, debounce input |
| PDF generation timeout | Media | Alto | Queue system con Bull, timeout aumentato a 60s |

### Best Practices
- ✅ Usare componenti riutilizzabili da design system esistente
- ✅ Validazione Zod su tutti i form
- ✅ Error boundaries React per editor
- ✅ Logging dettagliato (console in dev, Sentry in prod)
- ✅ Test E2E Playwright per flussi critici
- ✅ Documentazione inline (JSDoc)

---

## 🚀 Next Steps

1. **Review Planning** con team (1h meeting)
2. **Setup Branch** `feature/settings-templates-redesign`
3. **Kickoff Fase 1** - Database migration
4. **Daily Standup** per tracking progresso
5. **Demo Settimanale** con stakeholder

---

**Documento aggiornato**: 5 Novembre 2025  
**Owner**: Development Team  
**Reviewer**: Product Owner, Tech Lead  
**Status**: ✅ READY FOR IMPLEMENTATION
