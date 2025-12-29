# Advanced Forms System - Project Overview

**Progetto**: Sistema Form Avanzati con Logica Condizionale Complessa  
**Data Inizio**: 16 Novembre 2025  
**Manager**: Matteo Michielon  
**Priorità**: Alta  
**Stato**: Planning Phase

---

## 📋 Executive Summary

Implementazione di un sistema completo di gestione form avanzati con:
1. **Builder Form Visuale** - Interfaccia drag & drop per creare form complessi
2. **Logica Condizionale Avanzata** - 30 tipi di condizioni (uguaglianza, numeriche, date, permessi, workflow, scoring)
3. **Database Submissions** - Visualizzazione e gestione risposte con export
4. **Multi-Purpose** - Contatti pubblici, test corsi, anagrafiche pazienti
5. **Entity Mapping** - Collegamento campi form → campi database (Person, Company, ecc.)

---

## 🎯 Obiettivi Strategici

### Obiettivi Primari
1. ✅ **Raccolta Contatti Frontend Pubblico**
   - Form contatti, richiesta preventivo, iscrizione newsletter
   - Pubblicazione automatica su frontend pubblico
   - Raccolta dati GDPR-compliant

2. ✅ **Test Fine Corso con Scoring**
   - Quiz a risposta multipla/singola
   - Calcolo punteggio automatico
   - Tentativi massimi configurabili
   - Certificazione automatica al superamento

3. ✅ **Anagrafiche Pazienti (Future)**
   - Raccolta dati anamnestici
   - Mapping automatico a entità Person
   - Integrazione con sistema sanitario

### Obiettivi Secondari
4. ⚡ **Performance & UX**
   - Form builder intuitivo e veloce
   - Preview real-time del form
   - Validazione client-side e server-side

5. 🔒 **Security & Compliance**
   - GDPR compliant by design
   - Crittografia dati sensibili
   - Audit log completo

---

## 🏗️ Architettura Esistente

### ✅ Componenti Già Implementati

#### Backend Routes
```
✅ /api/v1/form-templates              (CRUD templates)
✅ /api/v1/submissions/advanced        (CRUD submissions)
✅ /api/v1/submissions/advanced/stats  (Statistiche)
```

#### Database Schema (Prisma)
```prisma
✅ model form_templates {
  id                String         @id
  name              String
  description       String?
  type              SubmissionType
  schema            Json           // ⚠️ Da estendere per logica condizionale
  validationRules   Json?
  conditionalFields Json?          // ⚠️ Da implementare logica completa
  isActive          Boolean
  version           Int
  tenantId          String
  form_fields       form_fields[]  // ✅ Relazione campi
}

✅ model form_fields {
  id             String
  templateId     String
  name           String
  label          String
  type           String
  required       Boolean
  placeholder    String?
  options        Json?
  validation     Json?
  conditional    Json?              // ⚠️ Struttura base, da estendere
  order          Int
}
```

#### Frontend Pages
```
✅ /src/pages/forms/FormTemplatesPage.tsx     (Lista templates)
❌ /src/pages/forms/FormBuilderPage.tsx       (NON ESISTE - DA CREARE)
❌ /src/pages/forms/FormSubmissionsPage.tsx   (NON ESISTE - DA CREARE)
```

#### Services
```typescript
✅ /src/services/formTemplates.ts
  - getFormTemplates()
  - createFormTemplate()
  - updateFormTemplate()
  - getFormSubmissions()
  - submitPublicForm()
```

#### Permessi RBAC
```
✅ VIEW_FORM_TEMPLATES
✅ CREATE_FORM_TEMPLATES
✅ EDIT_FORM_TEMPLATES
✅ DELETE_FORM_TEMPLATES
✅ MANAGE_FORM_TEMPLATES
✅ VIEW_FORM_SUBMISSIONS
✅ MANAGE_FORM_SUBMISSIONS
✅ EXPORT_FORM_SUBMISSIONS
```

---

## ⚠️ Gap Analysis

### Mancanze Critiche

#### 1. Form Builder UI
```
❌ Drag & Drop Builder
❌ Field Properties Panel
❌ Conditional Logic Visual Editor
❌ Preview Panel Real-time
❌ Field Library (componenti riutilizzabili)
```

#### 2. Logica Condizionale Avanzata
```
⚠️ Conditional fields esistono ma limitati a:
   - equals, not_equals, contains, in
   
❌ Mancano 26 tipi di condizioni richieste:
   - Numeriche (>, <, ≥, ≤, range)
   - Testuali avanzate (regex, startsWith, endsWith, length)
   - Date (>, <, range, relative, current)
   - Logiche annidate (AND, OR, NOT)
   - Workflow-based (status, phase)
   - Permission-based (role, tenant)
   - Scoring (correttezza risposte, punteggi)
```

#### 3. Test & Scoring System
```
❌ Question types (multiple choice, single choice)
❌ Correct answer marking
❌ Automatic scoring
❌ Max attempts
❌ Pass/fail threshold
❌ Certificate generation integration
```

#### 4. Entity Mapping
```
⚠️ entityMapping esiste in FormField ma non implementato:
   - entity: 'Person' | 'Company' | 'CourseSchedule'
   - field: string
   
❌ Manca logica di:
   - Automatic save to entity on submission
   - Field validation against entity schema
   - Conflict resolution
```

#### 5. File Upload
```
❌ File field type implementato ma senza:
   - Upload handling
   - Storage management
   - Preview
   - Size/type validation
```

#### 6. Submissions Database UI
```
❌ Tabella submissions con filtri
❌ Dettaglio submission
❌ Bulk actions
❌ Export (CSV, Excel, PDF)
❌ Stats dashboard
```

---

## 📦 Deliverables

### Fase 1: Foundation & Cleanup (2 giorni)
- [ ] Audit codice esistente form-templates
- [ ] Pulizia duplicati e consolidamento
- [ ] Estensione schema Prisma per nuove condizioni
- [ ] Migration database
- [ ] Test regression esistente

### Fase 2: Backend - Conditional Logic Engine (3 giorni)
- [ ] Service: Conditional Evaluator (30 condition types)
- [ ] Controller: Enhanced form validation
- [ ] API: Test evaluation endpoint
- [ ] Tests: Unit + Integration

### Fase 3: Backend - Scoring System (2 giorni)
- [ ] Service: Quiz Scorer
- [ ] Controller: Test submission with scoring
- [ ] API: Get test results
- [ ] Integration con CourseSchedule

### Fase 4: Frontend - Form Builder UI (5 giorni)
- [ ] Drag & Drop Builder Component
- [ ] Field Properties Panel
- [ ] Conditional Logic Visual Editor
- [ ] Preview Panel
- [ ] Save/Publish workflow

### Fase 5: Frontend - Submissions Dashboard (3 giorni)
- [ ] Submissions List Page
- [ ] Submission Detail Page
- [ ] Filters & Search
- [ ] Export functionality
- [ ] Stats widgets

### Fase 6: Entity Mapping & File Upload (3 giorni)
- [ ] Backend: Entity mapper service
- [ ] Backend: File upload handler
- [ ] Frontend: File upload component
- [ ] Frontend: Entity mapping UI

### Fase 7: Testing & Documentation (2 giorni)
- [ ] E2E tests (3 scenari: contatti, test, anagrafica)
- [ ] User guide
- [ ] API documentation
- [ ] Deployment guide

**Totale: 20 giorni lavorativi (4 settimane)**

---

## 🚨 Vincoli Non Negoziabili

### Tecnici
- ✅ Porte fisse: Frontend 5173, API 4001, Proxy 4003
- ✅ Compatibilità localhost + Hetzner/Supabase
- ✅ No hard-coding, tutto via env vars
- ✅ Architettura modulare, file <300 righe
- ✅ TypeScript strict mode
- ✅ Prisma per DB operations

### Security & Privacy
- ✅ GDPR compliant
- ✅ Crittografia dati sensibili (health data)
- ✅ Audit log tutti i cambiamenti
- ✅ No bypass admin
- ✅ Rate limiting su submission pubbliche

### User Experience
- ✅ Form builder < 3 click per campo base
- ✅ Preview real-time
- ✅ Mobile responsive
- ✅ Accessibility WCAG 2.1 AA

---

## 📊 Metriche di Successo

### Performance
- Form builder load: < 1s
- Form submission: < 500ms
- Conditional evaluation: < 100ms per field
- Export 1000 submissions: < 5s

### Usabilità
- Admin crea form semplice: < 5 minuti
- Admin crea test con scoring: < 10 minuti
- User completa form pubblico: < 2 minuti
- User completa test 10 domande: < 5 minuti

### Business
- Tasso conversione form contatti: > 30%
- Tasso completamento test: > 80%
- Soddisfazione utenti (survey): > 4/5

---

## 🔗 Documentazione di Riferimento

### Interna
- `/Users/matteo.michielon/project 2.0/.trae/rules/project_rules.md`
- `/Users/matteo.michielon/project 2.0/.trae/TRAE_SYSTEM_GUIDE.md`
- `docs/technical/RBAC_SYSTEM.md`
- `docs/deployment/ENVIRONMENT_VARS.md`

### Esterna
- React DnD: https://react-dnd.github.io/react-dnd/
- Formik: https://formik.org/
- Prisma Conditional Logic: https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting

---

## 👥 Team & Responsabilità

| Ruolo | Nome | Responsabilità |
|-------|------|----------------|
| Project Manager | Matteo Michielon | Coordinamento, planning, delivery |
| Backend Developer | Matteo Michielon | API, services, database |
| Frontend Developer | Matteo Michielon | UI/UX, components, integration |
| QA Tester | Matteo Michielon | Testing, bug fixing, documentation |

---

## 📅 Timeline

```
Week 1 (18-22 Nov)
├─ Fase 1: Foundation & Cleanup
└─ Fase 2: Conditional Logic Engine (start)

Week 2 (25-29 Nov)
├─ Fase 2: Conditional Logic Engine (complete)
├─ Fase 3: Scoring System
└─ Fase 4: Form Builder UI (start)

Week 3 (2-6 Dec)
├─ Fase 4: Form Builder UI (complete)
└─ Fase 5: Submissions Dashboard

Week 4 (9-13 Dec)
├─ Fase 6: Entity Mapping & File Upload
└─ Fase 7: Testing & Documentation
```

**Go-Live Previsto**: 13 Dicembre 2025

---

## 🎯 Next Steps

1. ✅ Review & approvazione planning (oggi)
2. → Creazione detailed planning Fase 1
3. → Setup branch `feature/advanced-forms-system`
4. → Kick-off Fase 1: Foundation & Cleanup

---

**Versione**: 1.0  
**Ultima Modifica**: 16 Novembre 2025  
**Status**: ✅ Ready for Approval
