procedi con la creazione dei documenti di dettaglio ma valuta che siano coerenti tra l’ora e con l’organizzazione già in essere # Template Management System - Project Overview

**Data Inizio**: 4 Novembre 2025  
**Priorità**: Alta  
**Tipologia**: Feature Enhancement + System Integration  

## 🎯 Obiettivi del Progetto

### Obiettivo Principale
Implementare un sistema completo di gestione template per la generazione automatizzata di documenti PDF professionali (Lettere di Incarico, Registri Presenze, Attestati) con integrazione Google Workspace e editor visuale intuitivo.

### Obiettivi Specifici
1. **Template Management**
   - Creazione/modifica template tramite editor WYSIWYG
   - Import/export da Google Docs e Google Slides
   - Versionamento e storico modifiche
   - Template predefiniti per ogni tipo documento

2. **Marker System**
   - Sistema di placeholder dinamici collegati a DB
   - Auto-completion intelligente
   - Validazione markers in fase di editing
   - Preview in real-time con dati mock

3. **PDF Generation Engine**
   - Rendering ottimizzato con dati da Prisma
   - Gestione immagini/loghi/firme
   - Batch generation per corsi con multipli partecipanti
   - Caching per performance

4. **User Experience**
   - UI intuitiva per non-tecnici
   - Drag & drop per elementi grafici
   - Preview live durante editing
   - Help contestuale per markers

---

## 📋 Scope del Progetto

### In Scope
✅ **Lettere di Incarico**
- Template personalizzabili per assegnazione trainer
- Markers: {trainer_name}, {course_title}, {date}, {company_name}, {location}
- Generazione singola o batch per multipli trainer
- Firma digitale (opzionale)

✅ **Registri Presenze**
- Layout tabellare con sessioni corso
- Markers: {course_title}, {company}, {sessions_list}, {participants_list}
- Generazione automatica da CourseSchedule
- Esportazione in PDF e Excel

✅ **Attestati Partecipanti**
- Design professionale con loghi/intestazioni
- Markers: {participant_name}, {cf}, {course_title}, {duration}, {date}, {trainer}
- Numerazione progressiva automatica
- Batch generation per tutti i partecipanti di un corso

✅ **Google Workspace Integration**
- Import template da Google Docs (via API o copy/paste)
- Import layout da Google Slides per attestati
- Sync opzionale per aggiornamenti template

✅ **Template Editor**
- Editor WYSIWYG con Tiptap/Quill
- Marker picker con autocompletamento
- Style customization (fonts, colors, spacing)
- Layout presets (1 colonna, 2 colonne, landscape)

### Out of Scope (Futuro)
❌ Firma digitale avanzata (PAdES/CAdES)  
❌ OCR per import template scannerizzati  
❌ Integrazione Microsoft Word Online  
❌ Template collaborativi multi-utente  
❌ Versioning avanzato con diff visualization  

---

## 🏗️ Architettura Tecnica

### Stack Tecnologico

**Frontend**
- React 18 + TypeScript
- Editor: **Tiptap v2** (extensible, React-friendly)
- PDF Viewer: **react-pdf** o **pdf.js**
- Drag & Drop: **react-beautiful-dnd**
- Forms: React Hook Form + Zod validation
- State: Context API + React Query

**Backend**
- Node.js + Express (document-server esistente)
- PDF Generation: **Puppeteer** (HTML → PDF) o **PDFKit**
- DOCX Generation: **docxtemplater** (già utilizzato)
- Template Storage: PostgreSQL + File System
- Queue: Bull (per batch generation)

**Integrations**
- Google Docs API (read-only import)
- Google Slides API (layout import)
- Prisma ORM per data fetching
- AWS S3 / Local Storage per PDF finali

### Database Schema (Prisma Extensions)

```prisma
model DocumentTemplate {
  id              String           @id @default(uuid())
  name            String
  type            TemplateType     // LETTER_OF_ENGAGEMENT, ATTENDANCE_REGISTER, CERTIFICATE
  format          TemplateFormat   // HTML, DOCX, GOOGLE_DOCS
  content         String           @db.Text // HTML o JSON structure
  markers         Json             // Array di marker disponibili
  styles          Json             // CSS/styling configuration
  layout          Json             // Page layout settings
  
  // Google Integration
  googleDocsId    String?
  googleSlidesId  String?
  lastSyncedAt    DateTime?
  
  // Metadata
  isDefault       Boolean          @default(false)
  isActive        Boolean          @default(true)
  version         Int              @default(1)
  createdBy       String
  tenantId        String
  
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  deletedAt       DateTime?
  
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  creator         Person           @relation(fields: [createdBy], references: [id])
  
  // Relations
  versions        TemplateVersion[]
  generatedDocs   GeneratedDocument[]
  
  @@index([tenantId, type])
  @@index([isDefault, isActive])
}

model TemplateVersion {
  id          String           @id @default(uuid())
  templateId  String
  version     Int
  content     String           @db.Text
  changes     String?          // Descrizione modifiche
  createdBy   String
  createdAt   DateTime         @default(now())
  
  template    DocumentTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  creator     Person           @relation(fields: [createdBy], references: [id])
  
  @@unique([templateId, version])
}

model GeneratedDocument {
  id              String           @id @default(uuid())
  templateId      String
  type            TemplateType
  entityId        String           // scheduleId, personId, etc
  entityType      String           // "schedule", "person", etc
  
  filename        String
  filePath        String
  fileUrl         String
  fileSize        Int
  
  // Generation metadata
  generatedBy     String
  generatedAt     DateTime         @default(now())
  markers         Json             // Actual data used for generation
  
  tenantId        String
  
  template        DocumentTemplate @relation(fields: [templateId], references: [id])
  generator       Person           @relation(fields: [generatedBy], references: [id])
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, type, entityId])
  @@index([generatedAt])
}

enum TemplateType {
  LETTER_OF_ENGAGEMENT    // Lettera di Incarico
  ATTENDANCE_REGISTER     // Registro Presenze
  CERTIFICATE             // Attestato
  INVOICE                 // Fattura (future)
  COURSE_PROGRAM          // Programma Corso (future)
}

enum TemplateFormat {
  HTML
  DOCX
  GOOGLE_DOCS
  GOOGLE_SLIDES
}
```

---

## 🎨 User Interface Design

### Template Management Dashboard (`/settings/templates`)

**Layout**: 3 colonne
- **Sidebar Left**: Filtri per tipo, stato, data
- **Main Area**: Grid cards template con preview miniature
- **Sidebar Right**: Quick actions, stats, help

**Actions disponibili**:
- ➕ Crea Nuovo (wizard 3 step)
- 📥 Import da Google Docs/Slides
- ✏️ Modifica Template
- 👁️ Preview con dati mock
- 📋 Duplica
- 🗑️ Elimina (soft delete)
- ⭐ Imposta come Default
- 📊 Storico Versioni

### Template Editor (`/settings/templates/:id/edit`)

**Layout**: Full-screen editor
- **Top Toolbar**: Save, Preview, Help, Version History
- **Left Sidebar**: Markers Library (drag & drop)
- **Center**: Editor Canvas (Tiptap)
- **Right Sidebar**: Styles Panel (fonts, colors, spacing)

**Editor Features**:
- WYSIWYG editing con formattazione rich text
- Marker autocomplete con `{` trigger
- Drag & drop markers dal sidebar
- Real-time preview toggle
- Responsive layout preview (A4, Letter)
- Undo/Redo history

### Document Generation Interface

**Integrato in**:
- `/schedules/:id` → Bottone "Genera Documenti"
- `/schedules/:id/participants` → Bulk actions
- `/trainers/:id` → Genera Lettera Incarico

**Modal Generation**:
```
┌─────────────────────────────────────────┐
│ Genera Documenti - Corso Antincendio   │
├─────────────────────────────────────────┤
│                                         │
│ 📄 Seleziona Tipo Documento             │
│ ○ Lettera di Incarico (Trainer)        │
│ ○ Registro Presenze (Corso)            │
│ ● Attestati (Partecipanti) [Selected]  │
│                                         │
│ 📋 Template                             │
│ [Dropdown: Default Attestato ▼]        │
│                                         │
│ 👥 Destinatari (3 selezionati)         │
│ ☑ Mario Rossi                           │
│ ☑ Laura Bianchi                         │
│ ☑ Giuseppe Verdi                        │
│                                         │
│ 🎨 Opzioni                              │
│ ☑ Genera PDF                            │
│ ☑ Invia via email                       │
│ ☐ Salva in archivio                    │
│                                         │
│ [Anteprima] [Annulla]  [Genera →]      │
└─────────────────────────────────────────┘
```

---

## 📊 Marker System Design

### Marker Categories

**1. Person Markers**
```typescript
{
  category: 'person',
  markers: [
    { key: '{person.firstName}', example: 'Mario' },
    { key: '{person.lastName}', example: 'Rossi' },
    { key: '{person.fullName}', example: 'Mario Rossi' },
    { key: '{person.email}', example: 'mario.rossi@example.com' },
    { key: '{person.cf}', example: 'RSSMRA80A01H501U' },
    { key: '{person.phone}', example: '+39 333 1234567' },
    { key: '{person.address}', example: 'Via Roma 1, Milano' },
    { key: '{person.birthDate}', example: '01/01/1980' },
    { key: '{person.birthPlace}', example: 'Roma (RM)' }
  ]
}
```

**2. Course Markers**
```typescript
{
  category: 'course',
  markers: [
    { key: '{course.title}', example: 'Corso Antincendio Rischio Alto' },
    { key: '{course.code}', example: 'ANT-RA-2025' },
    { key: '{course.duration}', example: '16 ore' },
    { key: '{course.validityYears}', example: '3 anni' },
    { key: '{course.category}', example: 'Sicurezza' },
    { key: '{course.description}', example: 'Corso di formazione...' },
    { key: '{course.regulation}', example: 'D.Lgs. 81/2008' }
  ]
}
```

**3. Schedule Markers**
```typescript
{
  category: 'schedule',
  markers: [
    { key: '{schedule.startDate}', example: '15/01/2025' },
    { key: '{schedule.endDate}', example: '22/01/2025' },
    { key: '{schedule.location}', example: 'Aula Formazione - Milano' },
    { key: '{schedule.maxParticipants}', example: '15' },
    { key: '{schedule.sessionsCount}', example: '2' },
    { key: '{schedule.totalHours}', example: '16' }
  ]
}
```

**4. Company Markers**
```typescript
{
  category: 'company',
  markers: [
    { key: '{company.name}', example: 'Acme SpA' },
    { key: '{company.vatNumber}', example: '12345678901' },
    { key: '{company.fiscalCode}', example: '12345678901' },
    { key: '{company.address}', example: 'Via Milano 10, Roma' },
    { key: '{company.legalRepresentative}', example: 'Giovanni Bianchi' },
    { key: '{company.pec}', example: 'acme@pec.it' }
  ]
}
```

**5. Trainer Markers**
```typescript
{
  category: 'trainer',
  markers: [
    { key: '{trainer.fullName}', example: 'Prof. Marco Neri' },
    { key: '{trainer.certifications}', example: 'Antincendio, Primo Soccorso' },
    { key: '{trainer.specialties}', example: 'Sicurezza sul lavoro' }
  ]
}
```

**6. System Markers**
```typescript
{
  category: 'system',
  markers: [
    { key: '{current.date}', example: '04/11/2025' },
    { key: '{current.year}', example: '2025' },
    { key: '{tenant.name}', example: 'Element Medica' },
    { key: '{tenant.logo}', example: '[LOGO_IMAGE]' },
    { key: '{document.progressiveNumber}', example: '123/2025' }
  ]
}
```

### Marker Resolution Engine

```typescript
interface MarkerContext {
  person?: Person;
  course?: Course;
  schedule?: CourseSchedule;
  company?: Company;
  trainer?: Person;
  tenant?: Tenant;
  customData?: Record<string, any>;
}

class MarkerResolver {
  resolve(template: string, context: MarkerContext): string {
    // 1. Find all markers in template
    // 2. Replace with actual data from context
    // 3. Handle missing data (show placeholder or error)
    // 4. Format dates/numbers based on locale
    // 5. Return processed template
  }
  
  validate(template: string, allowedMarkers: string[]): ValidationResult {
    // Check for unknown markers
    // Suggest corrections for typos
  }
  
  preview(template: string, mockData: MarkerContext): string {
    // Generate preview with mock data
  }
}
```

---

## 🔄 Workflow Implementation

### 1. Workflow Creazione Template

```
User Action                    System Response
─────────────────────────────────────────────────
1. Click "Nuovo Template"  →  Open Template Wizard
   
2. Select Type:            →  Load type-specific
   - Lettera Incarico         defaults & markers
   - Registro Presenze
   - Attestato
   
3. Choose Method:          →  Initialize editor
   - Editor Visuale
   - Import Google Docs
   - Duplica Esistente
   
4. Edit Content:           →  Auto-save draft
   - Add markers              every 30 seconds
   - Style formatting
   - Preview real-time
   
5. Save Template           →  Validate markers
                           →  Save to DB
                           →  Generate thumbnail
                           →  Redirect to list
```

### 2. Workflow Import da Google Docs

```
1. Click "Import Google Docs"
2. Enter Google Docs URL or ID
3. System fetch document via API
4. Parse content → HTML conversion
5. Auto-detect potential markers
6. Show preview with marker suggestions
7. User confirms/adjusts markers
8. Save as new template
```

### 3. Workflow Generazione Documento

```
User Context: /schedules/123 (Corso Antincendio)

1. Click "Genera Documenti" button
2. Modal opens with options:
   - Select doc type
   - Select template (default pre-selected)
   - Select recipients (all participants pre-checked)
   - Options: PDF, Email, Archive
   
3. Click "Genera"
4. Backend Process:
   a. Fetch schedule data + participants
   b. Load template
   c. For each participant:
      - Resolve markers with participant data
      - Render HTML with data
      - Convert to PDF (Puppeteer)
      - Generate progressive number
      - Save to DB + file system
   d. Queue email sending (if requested)
   e. Return generated files list
   
5. Show success modal with:
   - Generated files count
   - Download all (ZIP)
   - View individual PDFs
   - Resend emails
```

---

## 🚀 Implementation Phases

### PHASE 1: Foundation (Week 1) [PRIORITÀ ALTA]
**Goal**: Setup base infrastructure

- [ ] Database schema migration (Prisma)
- [ ] Update existing `TemplateLink` model → `DocumentTemplate`
- [ ] Backend API routes structure
- [ ] Frontend routing + base pages
- [ ] Editor library integration (Tiptap)
- [ ] Marker system architecture

**Deliverables**:
- ✅ Prisma schema updated
- ✅ API endpoints skeleton
- ✅ Template list page functional
- ✅ Basic editor page working

### PHASE 2: Lettere di Incarico (Week 2) [PRIORITÀ ALTA]
**Goal**: Complete first document type

- [ ] Letter template editor with markers
- [ ] Letter generation engine
- [ ] PDF export functionality
- [ ] Integration with trainer management
- [ ] Batch generation for multiple trainers

**Deliverables**:
- ✅ Lettere di Incarico fully functional
- ✅ Default template created
- ✅ User can generate from trainer page

### PHASE 3: Registri Presenze (Week 3) [PRIORITÀ MEDIA]
**Goal**: Attendance register system

- [ ] Table-based template editor
- [ ] Sessions list generation
- [ ] Participants signature fields
- [ ] Auto-generation from schedule
- [ ] Excel export option

**Deliverables**:
- ✅ Registro presenze template
- ✅ Generation from schedule detail
- ✅ PDF + Excel export

### PHASE 4: Attestati Upgrade (Week 4) [PRIORITÀ ALTA]
**Goal**: Enhanced certificate system

- [ ] Migrate existing attestati to new system
- [ ] Template editor with image support
- [ ] Progressive numbering system
- [ ] Batch generation optimization
- [ ] Email sending integration

**Deliverables**:
- ✅ New attestati template system
- ✅ Backward compatibility
- ✅ Performance improved

### PHASE 5: Google Integration (Week 5-6) [PRIORITÀ BASSA]
**Goal**: Google Workspace features

- [ ] Google OAuth setup
- [ ] Google Docs API integration
- [ ] Google Slides API for layouts
- [ ] Import wizard
- [ ] Sync functionality

**Deliverables**:
- ✅ Import from Google Docs working
- ✅ Layout import from Slides
- ✅ Documentation for users

### PHASE 6: Polish & Optimization (Week 7) [PRIORITÀ MEDIA]
**Goal**: UX improvements and performance

- [ ] Drag & drop improvements
- [ ] Template preview optimization
- [ ] Batch generation with queue
- [ ] Error handling & validation
- [ ] User documentation

**Deliverables**:
- ✅ Smooth UX across all features
- ✅ Fast PDF generation
- ✅ Complete user guide

---

## 📈 Success Metrics

**Technical KPIs**:
- PDF Generation Time: < 3 seconds per document
- Batch Generation: 50 documents in < 30 seconds
- Template Save Time: < 1 second
- Editor Load Time: < 2 seconds
- Uptime: 99.5%

**Business KPIs**:
- Template Creation Time: < 10 minutes per template
- User Adoption Rate: 80% of users using templates within 1 month
- Document Generation Rate: 50% increase in generated documents
- Error Rate: < 2% failed generations
- User Satisfaction: > 4.5/5 stars

**User Experience KPIs**:
- Template Editor Usability: < 5 clicks to insert marker
- Preview Load Time: < 1 second
- Mobile Responsiveness: Full functionality on tablet
- Help Documentation Access: < 2 clicks from any screen

---

## 🔒 Security & Compliance

### Data Protection
- Template content stored encrypted (at rest)
- Generated PDFs secured with tenant isolation
- Marker data sanitization to prevent injection
- Audit log for all template modifications

### Access Control
- Role-based permissions (Admin, Manager, User)
- Template creation restricted to Admin/Manager
- Template usage allowed for all users
- Generated documents visible only to creator + admin

### GDPR Compliance
- Personal data markers flagged
- Consent tracking for generated documents
- Right to deletion for generated PDFs
- Data export functionality

### File Security
- Virus scanning on file upload
- File type validation
- Size limits enforcement
- Secure file storage (S3 or encrypted local)

---

## 📚 Documentation Plan

### Technical Documentation
- API Reference (Swagger/OpenAPI)
- Database Schema Documentation
- Marker System Guide
- Google Integration Setup Guide
- Deployment Instructions

### User Documentation
- Template Creation Guide (with screenshots)
- Marker Reference Manual
- Import from Google Docs Tutorial
- Troubleshooting Guide
- FAQ Section

### Video Tutorials
- Creating Your First Template (5 min)
- Using Markers Effectively (3 min)
- Importing from Google Docs (4 min)
- Batch Document Generation (3 min)

---

## 🎯 Next Steps

1. **Review and Approval** (1 day)
   - Stakeholder review of planning
   - Adjust priorities based on feedback
   - Finalize timeline

2. **Development Start** (Day 2)
   - Create feature branch `feature/template-management-system`
   - Setup development environment
   - Begin Phase 1 implementation

3. **Weekly Check-ins**
   - Every Monday: Sprint planning
   - Every Friday: Demo + retrospective
   - Daily: Async progress updates

---

**Document Version**: 1.0  
**Last Updated**: 4 Novembre 2025  
**Author**: System Architect  
**Status**: DRAFT - Awaiting Approval
