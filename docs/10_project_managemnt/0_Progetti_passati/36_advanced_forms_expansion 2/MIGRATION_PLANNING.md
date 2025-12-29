# Migration Planning - Backend Copia e Src Copia

**Progetto**: Integrazione completa backend copia e src copia  
**Data Inizio**: 18 Novembre 2025  
**Manager**: Matteo Michielon  
**Obiettivo**: Ricreare funzionalità complete da progetti copia  
**Priorità**: CRITICA

---

## 📋 Executive Summary

Questo documento descrive il piano completo per integrare tutti i file necessari da:
- **backend copia** → **backend**
- **src copia** → **src**

### Obiettivi Primari
1. ✅ Allineamento schema Prisma (camelCase enforced)
2. ✅ Integrazione controllers, services, routes backend
3. ✅ Integrazione componenti, pages, hooks frontend
4. ✅ Mantenimento compatibilità ambiente esistente
5. ✅ Zero breaking changes per funzionalità esistenti

### Vincoli Non Negoziabili
- Porte fisse: frontend 5173, api 4001, proxy 4003
- Credenziali test: admin@example.com / Admin123!
- GDPR compliance mantenuto
- Multi-tenancy intatto
- Soft delete su tutte le entità
- Nessun bypass security, neanche per admin

---

## 🎯 Fasi del Progetto

### **FASE 1: Analisi e Backup (30 min)**

#### Task 1.1: Analisi Schema Prisma
**Obiettivo**: Identificare differenze tra schema.prisma dei due progetti

**Steps**:
1. Leggere `backend copia/prisma/schema.prisma` completo
2. Confrontare con `backend/prisma/schema.prisma` corrente
3. Identificare modelli mancanti o modificati:
   - form_templates vs formTemplates
   - form_fields vs formFields
   - form_submissions vs formSubmissions
   - cms_pages, cms_menus (se presenti)
   - seo_settings (se presenti)
4. Creare lista modifiche necessarie con mapping snake_case → camelCase

**Output**: `SCHEMA_DIFF_REPORT.md`

#### Task 1.2: Backup Database e Files
**Obiettivo**: Proteggere dati esistenti prima di modifiche

**Steps**:
```bash
# Backup schema Prisma
cp backend/prisma/schema.prisma backend/prisma/schema.prisma.backup-$(date +%Y%m%d-%H%M%S)

# Backup database PostgreSQL
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup file critici
tar -czf backend-backup-$(date +%Y%m%d-%H%M%S).tar.gz backend/
tar -czf src-backup-$(date +%Y%m%d-%H%M%S).tar.gz src/
```

**Output**: File di backup in `/backups/`

---

### **FASE 2: Backend Migration (3-4 ore)**

#### Task 2.1: Aggiornamento Schema Prisma
**Obiettivo**: Integrare modelli mancanti in camelCase

**Steps**:
1. Per ogni modello in `backend copia/prisma/schema.prisma`:
   - Se manca in `backend/prisma/schema.prisma` → copiare con nomi camelCase
   - Se esiste ma differente → merge campi mancanti
   - Aggiungere relazioni mancanti
   - Verificare indici per performance
2. Esempio conversione:
   ```prisma
   // Da backend copia (snake_case)
   model form_templates {
     id String @id
     name String
     created_at DateTime
   }
   
   // A backend (camelCase)
   model FormTemplate {
     id String @id
     name String
     createdAt DateTime @map("created_at")
     
     @@map("form_templates")
   }
   ```
3. Mantenere `@@map()` per compatibilità con database esistente

**Output**: `backend/prisma/schema.prisma` aggiornato

#### Task 2.2: Generazione Migration
**Obiettivo**: Creare migration SQL sicura

**Steps**:
```bash
cd backend
npx prisma migrate dev --name add_missing_models_from_copia
npx prisma generate
```

**Validazioni**:
- ✅ Migration è SOLO additiva (no DROP)
- ✅ Nessun data loss
- ✅ Backward compatible

**Output**: `backend/prisma/migrations/XXXXXX_add_missing_models_from_copia/`

#### Task 2.3: Controllers Integration
**Obiettivo**: Copiare controllers mancanti

**Files da analizzare**:
```
backend copia/controllers/
  - advancedSubmissionsController.js
  - cmsController.js
  - contactSubmissionController.js
  - formTemplateController.js
  - formTemplatesController.js
  - publicCoursesController.js
  - publicFormsController.js
```

**Steps per ogni controller**:
1. Verificare se esiste in `backend/controllers/`
2. Se manca → copiare e adattare:
   - Import paths corretti (`../../utils/logger.js`)
   - Prisma model names in camelCase
   - TenantId filtering obbligatorio
   - Soft delete pattern (`deletedAt: null`)
   - GDPR audit logging
3. Se esiste → merge solo funzioni mancanti

**Output**: Controllers aggiornati in `backend/controllers/`

#### Task 2.4: Services Integration
**Obiettivo**: Copiare services mancanti

**Files da analizzare**:
```
backend copia/services/
  - formsService.js
  - cmsService.js
  - seoService.js
  - publicFormsService.js
  - [altri services]
```

**Steps**:
1. Per ogni service in backend copia:
   - Verificare esistenza in backend/services/
   - Copiare se mancante, adattando:
     - Prisma queries in camelCase
     - Multi-tenancy enforcement
     - Soft delete (`where: { deletedAt: null }`)
     - Error handling con logger
     - Validazione input
2. Integrare validazioni con Joi/Zod

**Output**: Services completi in `backend/services/`

#### Task 2.5: Routes Integration
**Obiettivo**: Integrare endpoint API mancanti

**Files da analizzare**:
```
backend copia/routes/
  - formsRoutes.js
  - cmsRoutes.js
  - seoRoutes.js
  - publicRoutes.js
```

**Steps**:
1. Per ogni route file:
   - Verificare endpoint mancanti
   - Copiare in `backend/routes/` con:
     - API versioning (`/api/v1/...`)
     - Middleware auth corretti
     - Permission checks (`requirePermission`)
     - Rate limiting appropriato
     - CSRF protection per POST pubblici
2. Registrare route in `backend/servers/api-server.js`

**Output**: Routes complete in `backend/routes/`

#### Task 2.6: Middleware e Utils
**Obiettivo**: Copiare utilities mancanti

**Steps**:
1. Verificare middleware in `backend copia/middleware/`
2. Copiare solo se non duplicati con backend esistente
3. Verificare utils in `backend copia/utils/`
4. Copiare utilities mancanti (validators, helpers, formatters)

**Output**: Middleware e utils aggiornati

#### Task 2.7: Seed.js Update
**Obiettivo**: Integrare dati demo da backend copia

**Steps**:
1. Aprire `backend copia/prisma/seed.js`
2. Identificare template forms, cms pages, seo settings
3. Integrare in `backend/prisma/seed.js` mantenendo:
   - Template esistenti (demo-conditional-sections)
   - ID fissi per persistenza
   - Permissions aggiornati
4. Aggiungere permessi per CMS, SEO se mancanti

**Output**: `backend/prisma/seed.js` completo

---

### **FASE 3: Frontend Migration (3-4 ore)**

#### Task 3.1: Analisi Componenti
**Obiettivo**: Identificare componenti da copiare

**Directories da analizzare**:
```
src copia/components/
  - forms/          (FormBuilder, FormTemplatesPage, ecc)
  - cms/            (CMSEditor, PageManager, ecc)
  - seo/            (SEOSettings, MetaTagsEditor, ecc)
  - public/         (PublicFormView, PublicCourses, ecc)
  - shared/         (componenti riutilizzabili)
  - ui/             (design system components)
```

**Steps**:
1. Creare lista componenti in src copia non presenti in src
2. Verificare dipendenze tra componenti
3. Identificare ordine di copia per risolvere dipendenze

**Output**: `FRONTEND_COMPONENTS_CHECKLIST.md`

#### Task 3.2: Copia UI Components
**Obiettivo**: Copiare componenti UI base

**Steps**:
1. Copiare da `src copia/components/ui/` a `src/components/ui/`
2. Verificare compatibilità con shadcn/ui esistente
3. Evitare duplicazioni (Button, Input già esistono)
4. Copiare solo componenti nuovi necessari

**Output**: UI components in `src/components/ui/`

#### Task 3.3: Copia Forms Components
**Obiettivo**: Integrare sistema forms completo

**Files chiave**:
```
src copia/components/forms/
  - FormBuilder.tsx
  - FormFieldEditor.tsx
  - ConditionalLogicEditor.tsx
  - FormPreview.tsx
  - FormTemplatesPage.tsx
  - FormSubmissionsPage.tsx
  - PublicFormView.tsx
```

**Steps**:
1. Copiare ogni file verificando:
   - Import paths corretti
   - Services API esistono (`src/services/formTemplates.ts`)
   - Hooks disponibili (`src/hooks/`)
   - Types definiti (`src/types/`)
2. Adattare chiamate API a endpoint backend correnti

**Output**: Forms components completi in `src/components/forms/`

#### Task 3.4: Copia CMS Components
**Obiettivo**: Integrare CMS per contenuti pubblici

**Files da copiare**:
```
src copia/components/cms/
  - CMSEditor.tsx
  - PageManager.tsx
  - MediaLibrary.tsx
  - ContentBlocks.tsx
```

**Steps**:
1. Verificare backend API per CMS esiste
2. Copiare componenti adattando API calls
3. Integrare con media library esistente

**Output**: CMS components in `src/components/cms/`

#### Task 3.5: Copia SEO Components
**Obiettivo**: Integrare gestione SEO

**Files da copiare**:
```
src copia/components/seo/
  - SEOSettings.tsx
  - MetaTagsEditor.tsx
  - SitemapGenerator.tsx
```

**Steps**:
1. Copiare componenti
2. Verificare integrazione con CMS
3. Testare preview meta tags

**Output**: SEO components in `src/components/seo/`

#### Task 3.6: Services e API Frontend
**Obiettivo**: Copiare service layer mancanti

**Files da analizzare**:
```
src copia/services/
  - formTemplates.ts
  - formSubmissions.ts
  - cms.ts
  - seo.ts
  - publicForms.ts
```

**Steps**:
1. Per ogni service:
   - Verificare se esiste in `src/services/`
   - Copiare se mancante
   - Verificare endpoint API corrispondano al backend
   - Adattare response types se necessario

**Output**: Services completi in `src/services/`

#### Task 3.7: Hooks Frontend
**Obiettivo**: Copiare custom hooks

**Files da analizzare**:
```
src copia/hooks/
  - useFormBuilder.ts
  - useFormSubmissions.ts
  - useCMS.ts
  - useSEO.ts
  - useConditionalLogic.ts
```

**Steps**:
1. Copiare hooks mancanti
2. Verificare dipendenze da context
3. Testare integrazione con componenti

**Output**: Hooks in `src/hooks/`

#### Task 3.8: Pages e Routing
**Obiettivo**: Integrare pagine mancanti

**Files da copiare**:
```
src copia/pages/
  - forms/FormBuilderPage.tsx
  - forms/FormTemplatesPage.tsx
  - forms/FormSubmissionsPage.tsx
  - cms/CMSPage.tsx
  - seo/SEOPage.tsx
  - public/PublicFormsPage.tsx
```

**Steps**:
1. Copiare pages mancanti in `src/pages/`
2. Aggiornare `src/router/index.tsx`:
   ```typescript
   // Lazy loading
   const FormBuilderPage = lazy(() => import('../pages/forms/FormBuilderPage'));
   const FormSubmissionsPage = lazy(() => import('../pages/forms/FormSubmissionsPage'));
   
   // Routes
   { path: '/forms/builder/:id?', element: <FormBuilderPage /> },
   { path: '/forms/submissions', element: <FormSubmissionsPage /> }
   ```
3. Verificare protezione route con `requirePermission`

**Output**: Pages e routing aggiornati

#### Task 3.9: Utils e Helpers
**Obiettivo**: Copiare utilities frontend

**Files critici**:
```
src copia/utils/
  - conditionalLogic.ts      (30+ operators)
  - formValidation.ts        (15+ validation rules)
  - formHelpers.ts
  - seoHelpers.ts
```

**Steps**:
1. Copiare file in `src/utils/`
2. Verificare no conflitti con utils esistenti
3. Esportare da `src/utils/index.ts`

**Output**: Utils completi in `src/utils/`

---

### **FASE 4: Testing e Validazione (2-3 ore)**

#### Task 4.1: Backend Build Test
**Obiettivo**: Verificare backend compila senza errori

**Steps**:
```bash
cd backend
npm install
npx prisma generate
npm run lint
node servers/api-server.js --dry-run
```

**Validazioni**:
- ✅ No errori import
- ✅ No errori Prisma
- ✅ No errori ESLint

#### Task 4.2: Frontend Build Test
**Obiettivo**: Verificare frontend compila senza errori

**Steps**:
```bash
cd ../
npm install
npm run build
npx tsc --noEmit
```

**Validations**:
- ✅ No errori TypeScript
- ✅ Build Vite successful
- ✅ Bundle size accettabile

#### Task 4.3: Server Startup Test
**Obiettivo**: Verificare tutti i server partono

**Steps**:
```bash
# Terminal 1: Backend
cd backend
./start-servers.sh

# Terminal 2: Frontend
cd ../
npm run dev
```

**Verifiche**:
- ✅ API Server su porta 4001
- ✅ Proxy Server su porta 4003
- ✅ Frontend su porta 5173
- ✅ No errori nel console
- ✅ Health check: http://localhost:4003/health

#### Task 4.4: Authentication Test
**Obiettivo**: Verificare login funziona

**Steps**:
1. Aprire http://localhost:5173
2. Login con admin@example.com / Admin123!
3. Verificare:
   - JWT token salvato
   - User context popolato
   - Redirect a dashboard
   - Menu items visibili

**Output**: Screenshot login successful

#### Task 4.5: Forms CRUD Test
**Obiettivo**: Testare sistema forms completo

**Test Cases**:
1. **Create Form Template**:
   - Andare a /forms/templates
   - Click "Nuovo Form"
   - Compilare nome, descrizione
   - Aggiungere campi (text, email, select)
   - Aggiungere sezione con conditional
   - Salvare
   - ✅ Template creato

2. **Edit Form Template**:
   - Aprire template creato
   - Modificare campo
   - Aggiungere validazione
   - Salvare
   - ✅ Modifiche salvate

3. **Delete Form Template**:
   - Click delete su template
   - Confermare
   - ✅ Template soft deleted

#### Task 4.6: Submissions Test
**Obiettivo**: Testare invio e gestione submissions

**Test Cases**:
1. **Public Form Submit**:
   - Aprire form pubblico (senza login)
   - Compilare campi
   - Verificare validazioni client-side
   - Inviare
   - ✅ Submission salvata

2. **View Submissions**:
   - Login come admin
   - Andare a /forms/submissions
   - Verificare submission appare
   - Applicare filtri (date, status)
   - ✅ Filtri funzionano

3. **Update Status**:
   - Click su submission
   - Cambiare status (NEW → READ → RESOLVED)
   - Aggiungere note
   - ✅ Status aggiornato

4. **Export CSV**:
   - Click "Export"
   - Scaricare CSV
   - ✅ File scaricato con dati corretti

#### Task 4.7: CMS Test (se implementato)
**Obiettivo**: Testare gestione contenuti

**Test Cases**:
1. Create page
2. Edit content blocks
3. Publish page
4. View on frontend pubblico

#### Task 4.8: SEO Test (se implementato)
**Obiettivo**: Testare configurazione SEO

**Test Cases**:
1. Set meta tags
2. Generate sitemap
3. Verify meta tags in page source

---

### **FASE 5: Documentazione (1 ora)**

#### Task 5.1: Update Technical Docs
**Obiettivo**: Documentare nuove funzionalità

**Files da aggiornare**:
- `docs/technical/API_DOCUMENTATION.md` → endpoint forms, cms, seo
- `docs/technical/DATABASE_SCHEMA.md` → nuovi modelli
- `docs/technical/FRONTEND_ARCHITECTURE.md` → nuovi componenti

#### Task 5.2: Update User Docs
**Obiettivo**: Guide per utenti finali

**Files da creare/aggiornare**:
- `docs/user/FORMS_USER_GUIDE.md` → come creare forms
- `docs/user/CMS_USER_GUIDE.md` → gestione contenuti
- `docs/user/SEO_USER_GUIDE.md` → ottimizzazione SEO

#### Task 5.3: Update Deployment Docs
**Obiettivo**: Istruzioni per deploy

**Files da aggiornare**:
- `docs/deployment/PRODUCTION_DEPLOYMENT.md` → nuove migration
- `docs/deployment/ENVIRONMENT_VARIABLES.md` → variabili aggiuntive

#### Task 5.4: Create Migration Log
**Obiettivo**: Tracciabilità modifiche

**File da creare**: `docs/10_project_management/36_advanced_forms_expansion 2/MIGRATION_COMPLETED.md`

**Contenuto**:
- Data completamento
- Files modificati/aggiunti
- Breaking changes (se presenti)
- Rollback instructions
- Known issues

---

## 📊 Timeline Stimata

| Fase | Durata | Completamento |
|------|--------|---------------|
| Fase 1: Analisi | 30 min | 10% |
| Fase 2: Backend | 3-4 ore | 50% |
| Fase 3: Frontend | 3-4 ore | 85% |
| Fase 4: Testing | 2-3 ore | 95% |
| Fase 5: Docs | 1 ora | 100% |
| **TOTALE** | **8-10 ore** | |

---

## ⚠️ Rischi e Mitigazioni

### Rischio 1: Conflitti Schema Prisma
**Probabilità**: Media  
**Impatto**: Alto  
**Mitigazione**: 
- Backup obbligatorio prima di migrate
- Test in development prima di staging
- Rollback script preparato

### Rischio 2: Breaking Changes API
**Probabilità**: Bassa  
**Impatto**: Alto  
**Mitigazione**:
- API versioning (v1 resta intatto)
- Backward compatibility garantita
- Test integration completi

### Rischio 3: Performance Degradation
**Probabilità**: Bassa  
**Impatto**: Medio  
**Mitigazione**:
- Benchmark prima/dopo migration
- Indici database ottimizzati
- Bundle analysis frontend

### Rischio 4: Security Vulnerabilities
**Probabilità**: Bassa  
**Impatto**: Critico  
**Mitigazione**:
- Security review di controller copiati
- CSRF, rate limiting verificati
- Permission checks su tutti endpoint

---

## ✅ Acceptance Criteria

### Backend
- [x] Schema Prisma allineato con camelCase
- [x] Migration generata e testata
- [x] Controllers completi con auth/validation
- [x] Services integrati con soft delete
- [x] Routes registrate con versioning
- [x] Seed.js aggiornato
- [x] Tests passing (unit + integration)

### Frontend
- [x] Componenti forms completi
- [x] Form builder funzionante
- [x] Submissions page funzionante
- [x] CMS components integrati
- [x] SEO components integrati
- [x] Services API allineati
- [x] Routing aggiornato
- [x] Build senza errori TypeScript

### Testing
- [x] Login funziona
- [x] CRUD forms funziona
- [x] Submissions gestite correttamente
- [x] Export CSV funziona
- [x] Conditional logic funziona
- [x] Validazioni funzionano
- [x] Performance accettabile

### Compliance
- [x] GDPR compliance mantenuto
- [x] Multi-tenancy intatto
- [x] Soft delete su tutte entità
- [x] Audit trail completo
- [x] Security non compromessa

---

## 📝 Note Implementative

### Naming Conventions
- **Prisma Models**: PascalCase (FormTemplate, FormField)
- **DB Tables**: snake_case con @@map (form_templates)
- **API Endpoints**: kebab-case (/form-templates)
- **Frontend Components**: PascalCase (FormBuilder)
- **Functions/Hooks**: camelCase (useFormBuilder)

### Import Path Patterns
```javascript
// Backend
import logger from '../../utils/logger.js';
import prisma from '../../config/database.js';
import { requirePermission } from '../../middleware/auth.js';

// Frontend
import { FormBuilder } from '@/components/forms';
import { useFormBuilder } from '@/hooks';
import api from '@/services/api';
```

### Error Handling
```javascript
// Backend
try {
  const result = await service.create(data);
  logger.info({ userId, tenantId, action: 'create' }, 'Success');
  res.json(result);
} catch (error) {
  logger.error({ userId, tenantId, error: error.message }, 'Failed');
  res.status(500).json({ error: 'Internal server error' });
}

// Frontend
try {
  const data = await api.formTemplates.create(formData);
  toast.success('Form creato con successo');
} catch (error) {
  toast.error(error.message || 'Errore durante la creazione');
}
```

### Security Checklist
- [x] TenantId filtering su tutte le query
- [x] Permission checks su tutti gli endpoint
- [x] Input validation con Joi/Zod
- [x] Rate limiting appropriato
- [x] CSRF protection su POST pubblici
- [x] SQL injection protection (Prisma)
- [x] XSS protection (sanitization)
- [x] Password hashing (bcrypt)

---

## 🚀 Next Steps

Dopo completamento migration:
1. **Staging Deploy**: Test su ambiente simil-produzione
2. **User Acceptance Testing**: Feedback stakeholders
3. **Performance Tuning**: Ottimizzazioni se necessario
4. **Production Deploy**: Graduale rollout
5. **Monitoring**: Verifica metriche post-deploy

---

**Fine Planning Document**

