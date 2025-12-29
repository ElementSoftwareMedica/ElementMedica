# 🏢 Progetto 45 - Piano E2E Ristrutturazione Tenant (Opzione 2)

**Data Creazione**: 29 dicembre 2025  
**Ultimo Aggiornamento**: 29 dicembre 2025  
**Stato**: 📋 PIANIFICAZIONE DETTAGLIATA  
**Priorità**: CRITICA  
**Architettura**: **OPZIONE 2 - Un Tenant per Cliente (Customer-as-Tenant)**

---

## 📋 Executive Summary

### Perché Opzione 2?

L'Opzione 2 è stata scelta perché:

| Criterio | Opzione 1 (Branch=Tenant) | Opzione 2 (Customer=Tenant) | Vincitore |
|----------|---------------------------|------------------------------|-----------|
| Pulizia architetturale | ❌ 2 tenant per cliente | ✅ 1 tenant per cliente | Opt. 2 |
| Entità condivise | ❌ Duplicazione | ✅ Singola copia | Opt. 2 |
| Scalabilità branch | ❌ Nuovo tenant per branch | ✅ Nuovo enum value | Opt. 2 |
| Fatturazione | ❌ Complessa (multi-tenant) | ✅ Semplice (1 tenant) | Opt. 2 |
| Admin multi-tenant | ✅ PersonTenantAccess | ✅ PersonTenantAccess | Pari |
| Refactoring | ✅ Minimo | ❌ Significativo | Opt. 1 |
| Rischio bugs | ❌ Sincronizzazione | ✅ Nessuno | Opt. 2 |

**Decisione**: Il refactoring iniziale maggiore è compensato da un sistema più pulito e manutenibile nel lungo termine.

---

## 🎯 Architettura Target

### Schema Concettuale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ARCHITETTURA OPZIONE 2                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ADMIN GLOBALE (globalRole: ADMIN)                                      │
│  ├── Accesso a TUTTI i tenant tramite PersonTenantAccess               │
│  ├── Può vedere/gestire branch secondo PersonTenantAccess.features     │
│  └── NO bypass - ogni azione tracciata                                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ TENANT: clinica-rossi-srl                                       │   │
│  │ enabledBranches: [MEDICA, FORMAZIONE]                           │   │
│  │                                                                 │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │           ENTITÀ BRANCH-SPECIFIC                           │ │   │
│  │  │                                                           │ │   │
│  │  │  branchType: MEDICA                branchType: FORMAZIONE │ │   │
│  │  │  ─────────────────                 ───────────────────── │ │   │
│  │  │  • Poliambulatorio                 • Course              │ │   │
│  │  │  • SedePoliambulatorio             • CourseSchedule      │ │   │
│  │  │  • Ambulatorio                     • CourseEnrollment    │ │   │
│  │  │  • Prestazione                     • CourseSession       │ │   │
│  │  │  • OffertaBundle                   • Attestato           │ │   │
│  │  │  • ListinoPrezzo                   • RegistroPresenze    │ │   │
│  │  │  • TariffarioMedico                • CourseTest*         │ │   │
│  │  │  • Convenzione*                    • ScheduleCompany     │ │   │
│  │  │  • SlotDisponibilita               • LetteraIncarico     │ │   │
│  │  │  • Appuntamento                                          │ │   │
│  │  │  • Visita                                                │ │   │
│  │  │  • Referto                                               │ │   │
│  │  │  • DisponibilitaMedico                                   │ │   │
│  │  │  • FatturaSanitaria                                      │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  │                                                                 │   │
│  │  ┌───────────────────────────────────────────────────────────┐ │   │
│  │  │           ENTITÀ CONDIVISE (branchType: null)              │ │   │
│  │  │                                                           │ │   │
│  │  │  • Company            • Person              • Template    │ │   │
│  │  │  • CompanySite        • PersonRole          • Document    │ │   │
│  │  │  • CodiceSconto       • PersonDocument      • CMSPage     │ │   │
│  │  │  • Preventivo*        • GdprAuditLog        • CMSMedia    │ │   │
│  │  │  • Fattura*           • ActivityLog         • Setting     │ │   │
│  │  │  • DVR                • ConsentRecord       • form_template│ │   │
│  │  │  • Sopralluogo        • ContactSubmission                 │ │   │
│  │  └───────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ACCESSO UTENTE:                                                        │
│  PersonTenantAccess.enabledFeatures: ['MEDICA', 'FORMAZIONE']          │
│  └── Controlla quali branch l'utente può vedere/operare                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Inventario Completo Entità (100 modelli)

### Classificazione per Branch

#### 🏥 BRANCH: MEDICA (38 entità)

| # | Entità | Azione | Note |
|---|--------|--------|------|
| 1 | `Poliambulatorio` | Aggiungere `branchType` | Radice struttura medica |
| 2 | `SedePoliambulatorio` | Eredita da Poliambulatorio | FK → Poliambulatorio |
| 3 | `OrarioSede` | Eredita da Sede | FK → SedePoliambulatorio |
| 4 | `ChiusuraSpecialeSede` | Eredita da Sede | FK → SedePoliambulatorio |
| 5 | `Ambulatorio` | Eredita da Sede | FK → SedePoliambulatorio |
| 6 | `OrarioAmbulatorio` | Eredita da Ambulatorio | FK → Ambulatorio |
| 7 | `Prestazione` | Aggiungere `branchType` | Entità principale |
| 8 | `AmbulatorioPrestazione` | Eredita | FK → Prestazione + Ambulatorio |
| 9 | `MedicoAbilitato` | Eredita da Ambulatorio | FK → Ambulatorio |
| 10 | `Strumento` | Aggiungere `branchType` | Attrezzature mediche |
| 11 | `StrumentoAmbulatorio` | Eredita | FK → Strumento |
| 12 | `ManutenzioneStrumento` | Eredita da Strumento | FK → Strumento |
| 13 | `PrestazioneStrumento` | Eredita | FK → Prestazione + Strumento |
| 14 | `PrestazioneTipologiaStrumento` | Eredita | FK → Prestazione |
| 15 | `ListinoPrezzo` | Aggiungere `branchType` | Prezzi prestazioni |
| 16 | `OffertaBundle` | Aggiungere `branchType` | Pacchetti/Bundle |
| 17 | `OffertaBundlePrestazione` | Eredita | FK → OffertaBundle |
| 18 | `TariffarioMedico` | Aggiungere `branchType` | Compensi medici |
| 19 | `Convenzione` | Aggiungere `branchType` | Convenzioni assicurative |
| 20 | `ConvenzionePoliambulatorio` | Eredita | FK → Convenzione |
| 21 | `ConvenzioneAzienda` | Eredita | FK → Convenzione |
| 22 | `RiconoscimentoConvenzione` | Eredita | FK → Convenzione |
| 23 | `RiconoscimentoErogato` | Eredita | FK → Riconoscimento |
| 24 | `SlotDisponibilita` | Eredita da Ambulatorio | FK → Ambulatorio |
| 25 | `Appuntamento` | Eredita da Prestazione | FK → Prestazione/Slot |
| 26 | `Visita` | Eredita da Appuntamento | FK → Appuntamento |
| 27 | `Referto` | Eredita da Visita | FK → Visita |
| 28 | `TemplateCampoVisita` | Aggiungere `branchType` | Template referto |
| 29 | `ValoreCampoVisita` | Eredita | FK → Visita |
| 30 | `DocumentoClinico` | Eredita da Visita | FK → Visita |
| 31 | `FatturaSanitaria` | Eredita da Visita | FK → Visita |
| 32 | `AuditClinico` | Eredita | Audit operations |
| 33 | `DisponibilitaMedico` | Aggiungere `branchType` | Disponibilità |
| 34 | `FerieAssenza` | Aggiungere `branchType` | Assenze medici |
| 35 | `NumeroChiamata` | Eredita | Sistema coda |
| 36 | `AllegatoVisita` | Eredita da Visita | FK → Visita |
| 37 | `PrestazioneAggiuntiva` | Eredita da Visita | FK → Visita |
| 38 | `VersioneReferto` | Eredita da Referto | FK → Referto |
| 39 | `FirmaDigitale` | Eredita da Referto | FK → Referto |
| 40 | `AllegatoReferto` | Eredita da Referto | FK → Referto |

#### 📚 BRANCH: FORMAZIONE (18 entità)

| # | Entità | Azione | Note |
|---|--------|--------|------|
| 1 | `Course` | Aggiungere `branchType` | Entità principale |
| 2 | `CourseSchedule` | Eredita da Course | FK → Course |
| 3 | `CourseEnrollment` | Eredita da Schedule | FK → Schedule |
| 4 | `CourseSession` | Eredita da Schedule | FK → Schedule |
| 5 | `ScheduleCompany` | Eredita da Schedule | FK → Schedule |
| 6 | `Attestato` | Eredita da Enrollment | FK → Enrollment |
| 7 | `RegistroPresenze` | Eredita da Schedule | FK → Schedule |
| 8 | `RegistroPresenzePartecipante` | Eredita | FK → RegistroPresenze |
| 9 | `CourseTestAssignment` | Eredita da Course | FK → Course |
| 10 | `CourseTestResult` | Eredita | FK → TestAssignment |
| 11 | `LetteraIncarico` | Eredita | Documenti formazione |

#### 🔄 ENTITÀ CONDIVISE (42 entità)

| # | Entità | Motivazione | Note |
|---|--------|-------------|------|
| 1 | `Company` | Cliente unico | Usata da entrambi i branch |
| 2 | `CompanySite` | Sede unica | FK → Company |
| 3 | `Person` | Persona unica | Dipendente/paziente/formando |
| 4 | `PersonRole` | Ruoli trasversali | Permessi cross-branch |
| 5 | `PersonDocument` | Documenti personali | FK → Person |
| 6 | `PersonTenantAccess` | Accesso tenant | Multi-tenant |
| 7 | `CodiceSconto` | Sconto unico | Valido per tutto il cliente |
| 8 | `CodiceAzienda` | FK → Sconto | |
| 9 | `CodicePersona` | FK → Sconto | |
| 10 | `CodiceCorso` | FK → Sconto | |
| 11 | `PreventivoSconto` | FK → Sconto | |
| 12 | `Preventivo` | Misto | Può avere voci medica+formazione |
| 13 | `Fattura` | Misto | Fattura unica |
| 14 | `FatturaAzienda` | FK → Fattura | |
| 15 | `DVR` | Sicurezza | Cross-branch |
| 16 | `Sopralluogo` | Sicurezza | Cross-branch |
| 17 | `Reparto` | Organizzazione | Cross-branch |
| 18 | `Template*` | Documenti | TemplateLink, TemplateVersion |
| 19 | `GeneratedDocument` | Documenti | Cross-branch |
| 20 | `GoogleTokens` | Integrazioni | |
| 21 | `CMSPage` | CMS | Multi-brand |
| 22 | `CMSPageView` | Analytics | |
| 23 | `CMSMedia` | Media | |
| 24 | `cms_media_folders` | Organizzazione | |
| 25 | `seo_configs` | SEO | |
| 26 | `sitemaps` | SEO | |
| 27 | `ContactSubmission` | Form pubblici | |
| 28 | `form_fields` | Form builder | |
| 29 | `form_templates` | Form builder | |
| 30 | `Permission` | RBAC | Sistema |
| 31 | `AdvancedPermission` | RBAC avanzato | |
| 32 | `RolePermission` | RBAC | |
| 33 | `CustomRole` | Ruoli custom | |
| 34 | `CustomRolePermission` | FK → CustomRole | |
| 35 | `RelationDefinition` | Relazioni | |
| 36 | `ActivityLog` | Audit | Campo branchType opzionale |
| 37 | `GdprAuditLog` | GDPR | |
| 38 | `ConsentRecord` | GDPR | |
| 39 | `SecurityAuditLog` | Security | |
| 40 | `DataRetentionPolicy` | GDPR | |
| 41 | `RefreshToken` | Auth | |
| 42 | `PersonSession` | Auth | |

#### ⚙️ ENTITÀ SISTEMA/TENANT (8 entità)

| # | Entità | Note |
|---|--------|------|
| 1 | `Tenant` | Modificare: aggiungere enabledBranches |
| 2 | `TenantConfiguration` | Config tenant |
| 3 | `TenantUsage` | Metriche uso |
| 4 | `TariffarioAziendale` | Tariffari custom (condiviso) |
| 5 | `VoceTariffario` | FK → Tariffario |
| 6 | `FasciaDipendentiPrezzo` | Pricing |

---

## 🗓️ Piano di Implementazione Dettagliato

### PANORAMICA FASI

| Fase | Nome | Durata | Dipendenze | Rischio |
|------|------|--------|------------|---------|
| 1 | Schema Prisma | 3 giorni | - | Basso |
| 2 | Migrazione Dati | 2 giorni | Fase 1 | Medio |
| 3 | Backend Core | 5 giorni | Fase 2 | Medio |
| 4 | Backend Services | 7 giorni | Fase 3 | Alto |
| 5 | Frontend Adaptation | 5 giorni | Fase 4 | Medio |
| 6 | UI Multi-tenant Admin | 3 giorni | Fase 5 | Basso |
| 7 | Testing E2E | 5 giorni | Fase 6 | Alto |
| **TOTALE** | | **30 giorni** | | |

---

## 📝 FASE 1: Schema Prisma (3 giorni)

### Task 1.1: Creare Enum BranchType

**File**: `backend/prisma/schema.prisma`

```prisma
// Aggiungere dopo gli altri enum
enum BranchType {
  MEDICA      // Poliambulatorio, visite, prestazioni
  FORMAZIONE  // Corsi, schedules, attestati
  // Futuri:
  // LABORATORIO
  // CONSULENZA
  // SICUREZZA
}
```

### Task 1.2: Modificare Tenant

```prisma
model Tenant {
  // ... campi esistenti ...
  
  // NUOVI CAMPI per Opzione 2
  enabledBranches   BranchType[]  @default([MEDICA, FORMAZIONE])
  primaryBranch     BranchType?   // Branch default per UI
  
  // ... relazioni esistenti ...
}
```

### Task 1.3: Modificare PersonTenantAccess

```prisma
model PersonTenantAccess {
  // ... campi esistenti ...
  
  // MODIFICARE enabledFeatures per usare BranchType
  enabledBranches   BranchType[]  @default([])  // NUOVO
  
  // Deprecare enabledFeatures[] stringa, usare enabledBranches[]
  // enabledFeatures   String[]   @default([])  // DEPRECATO
  
  // ... resto invariato ...
}
```

### Task 1.4: Aggiungere branchType alle Entità MEDICA

Entità che richiedono modifica diretta:

```prisma
// Prestazione
model Prestazione {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  // ... 
  @@index([tenantId, branchType])
}

// Poliambulatorio
model Poliambulatorio {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// OffertaBundle
model OffertaBundle {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// Strumento
model Strumento {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// Convenzione
model Convenzione {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// ListinoPrezzo
model ListinoPrezzo {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// TariffarioMedico
model TariffarioMedico {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// TemplateCampoVisita
model TemplateCampoVisita {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// DisponibilitaMedico
model DisponibilitaMedico {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}

// FerieAssenza
model FerieAssenza {
  // ... campi esistenti ...
  branchType    BranchType  @default(MEDICA)
  @@index([tenantId, branchType])
}
```

### Task 1.5: Aggiungere branchType alle Entità FORMAZIONE

```prisma
// Course
model Course {
  // ... campi esistenti ...
  branchType    BranchType  @default(FORMAZIONE)
  @@index([tenantId, branchType])
}

// CourseSchedule
model CourseSchedule {
  // ... campi esistenti ...
  branchType    BranchType  @default(FORMAZIONE)
  @@index([tenantId, branchType])
}
```

### Task 1.6: Aggiungere branchType opzionale alle Entità Miste

```prisma
// ActivityLog - per tracciare in quale branch è avvenuta l'azione
model ActivityLog {
  // ... campi esistenti ...
  branchType    BranchType?  // NULL = azione cross-branch
}

// Preventivo - può contenere voci di entrambi i branch
model Preventivo {
  // ... campi esistenti ...
  branchTypes   BranchType[]  @default([])  // Array dei branch coinvolti
}
```

### Task 1.7: Eseguire Migrazione Schema

```bash
# 1. Backup database
pg_dump -h localhost -U postgres element_medica > backup_pre_phase1.sql

# 2. Generare migrazione
cd backend
npx prisma migrate dev --name add_branch_type_support

# 3. Verificare generazione client
npx prisma generate

# 4. Verificare schema
npx prisma db pull
```

---

## 📝 FASE 2: Migrazione Dati (2 giorni)

### Task 2.1: Script Migrazione Branch Type

**File**: `backend/scripts/migrate-branch-types.js`

```javascript
/**
 * Script di migrazione per impostare branchType su entità esistenti
 * 
 * Logica:
 * - Tutte le entità nel tenant Element Medica → branchType: MEDICA
 * - Tutte le entità nel tenant Element Formazione → branchType: FORMAZIONE
 * - Entità nel tenant Default → branchType in base alla tabella
 */

import prisma from '../config/prisma-optimization.js';
import logger from '../utils/logger.js';

const TENANT_MEDICA_ID = '21ec594c-efc3-4300-bfa8-b43307a80c9b';
const TENANT_FORMAZIONE_ID = 'da59b77a-9564-45ce-bf83-8f15a56ceb22';

async function migrateBranchTypes() {
  logger.info('Starting branch type migration...');
  
  const medicaEntities = [
    'prestazione',
    'poliambulatorio',
    'offertaBundle',
    'strumento',
    'convenzione',
    'listinoPrezzo',
    'tariffarioMedico',
    'templateCampoVisita',
    'disponibilitaMedico',
    'ferieAssenza'
  ];
  
  const formazioneEntities = [
    'course',
    'courseSchedule'
  ];
  
  // Migra entità MEDICA
  for (const entity of medicaEntities) {
    const count = await prisma[entity].updateMany({
      where: { 
        tenantId: TENANT_MEDICA_ID,
        branchType: null // Solo se non già impostato
      },
      data: { branchType: 'MEDICA' }
    });
    logger.info(`Migrated ${count.count} ${entity} to MEDICA`);
  }
  
  // Migra entità FORMAZIONE
  for (const entity of formazioneEntities) {
    const count = await prisma[entity].updateMany({
      where: { 
        tenantId: TENANT_FORMAZIONE_ID,
        branchType: null
      },
      data: { branchType: 'FORMAZIONE' }
    });
    logger.info(`Migrated ${count.count} ${entity} to FORMAZIONE`);
  }
  
  // Aggiorna Tenant con enabledBranches
  await prisma.tenant.update({
    where: { id: TENANT_MEDICA_ID },
    data: { 
      enabledBranches: ['MEDICA'],
      primaryBranch: 'MEDICA'
    }
  });
  
  await prisma.tenant.update({
    where: { id: TENANT_FORMAZIONE_ID },
    data: { 
      enabledBranches: ['FORMAZIONE'],
      primaryBranch: 'FORMAZIONE'
    }
  });
  
  // Default Company = Admin globale con tutti i branch
  await prisma.tenant.update({
    where: { slug: 'default-company' },
    data: { 
      enabledBranches: ['MEDICA', 'FORMAZIONE'],
      primaryBranch: null
    }
  });
  
  logger.info('Branch type migration completed successfully');
}

migrateBranchTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Task 2.2: Script Migrazione PersonTenantAccess

```javascript
/**
 * Migra enabledFeatures (String[]) → enabledBranches (BranchType[])
 */

async function migratePersonTenantAccess() {
  const accesses = await prisma.personTenantAccess.findMany({
    where: { enabledFeatures: { isEmpty: false } }
  });
  
  for (const access of accesses) {
    const branches = access.enabledFeatures
      .map(f => {
        if (f.toLowerCase().includes('medica')) return 'MEDICA';
        if (f.toLowerCase().includes('formazione')) return 'FORMAZIONE';
        return null;
      })
      .filter(Boolean);
    
    await prisma.personTenantAccess.update({
      where: { id: access.id },
      data: { enabledBranches: branches }
    });
  }
}
```

### Task 2.3: Validazione Post-Migrazione

```javascript
/**
 * Verifica integrità migrazione
 */

async function validateMigration() {
  const checks = [
    // Tutte le prestazioni hanno branchType
    prisma.prestazione.count({ where: { branchType: null } }),
    // Tutti i corsi hanno branchType
    prisma.course.count({ where: { branchType: null } }),
    // Tutti i tenant hanno enabledBranches
    prisma.tenant.count({ where: { enabledBranches: { isEmpty: true } } })
  ];
  
  const [nullPrestazioni, nullCourses, emptyTenants] = await Promise.all(checks);
  
  if (nullPrestazioni > 0) throw new Error(`${nullPrestazioni} prestazioni senza branchType`);
  if (nullCourses > 0) throw new Error(`${nullCourses} courses senza branchType`);
  if (emptyTenants > 0) throw new Error(`${emptyTenants} tenants senza enabledBranches`);
  
  console.log('✅ Migration validation passed');
}
```

---

## 📝 FASE 3: Backend Core (5 giorni)

### Task 3.1: Creare BranchHelper

**File**: `backend/utils/branchHelper.js`

```javascript
/**
 * Branch Helper - Utilities per gestione branch
 * 
 * @module utils/branchHelper
 */

import logger from './logger.js';

// Configurazione entità per branch
export const BRANCH_CONFIG = {
  // Entità MEDICA
  prestazione: { branch: 'MEDICA', shared: false },
  poliambulatorio: { branch: 'MEDICA', shared: false },
  sedePoliambulatorio: { branch: 'MEDICA', shared: false, inherit: 'poliambulatorio' },
  ambulatorio: { branch: 'MEDICA', shared: false, inherit: 'sedePoliambulatorio' },
  offertaBundle: { branch: 'MEDICA', shared: false },
  offertaBundlePrestazione: { branch: 'MEDICA', shared: false, inherit: 'offertaBundle' },
  strumento: { branch: 'MEDICA', shared: false },
  convenzione: { branch: 'MEDICA', shared: false },
  listinoPrezzo: { branch: 'MEDICA', shared: false },
  tariffarioMedico: { branch: 'MEDICA', shared: false },
  slotDisponibilita: { branch: 'MEDICA', shared: false, inherit: 'ambulatorio' },
  appuntamento: { branch: 'MEDICA', shared: false },
  visita: { branch: 'MEDICA', shared: false, inherit: 'appuntamento' },
  referto: { branch: 'MEDICA', shared: false, inherit: 'visita' },
  disponibilitaMedico: { branch: 'MEDICA', shared: false },
  ferieAssenza: { branch: 'MEDICA', shared: false },
  fatturaSanitaria: { branch: 'MEDICA', shared: false },
  
  // Entità FORMAZIONE
  course: { branch: 'FORMAZIONE', shared: false },
  courseSchedule: { branch: 'FORMAZIONE', shared: false, inherit: 'course' },
  courseEnrollment: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
  courseSession: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
  scheduleCompany: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
  attestato: { branch: 'FORMAZIONE', shared: false, inherit: 'courseEnrollment' },
  registroPresenze: { branch: 'FORMAZIONE', shared: false, inherit: 'courseSchedule' },
  letteraIncarico: { branch: 'FORMAZIONE', shared: false },
  courseTestAssignment: { branch: 'FORMAZIONE', shared: false, inherit: 'course' },
  
  // Entità CONDIVISE
  company: { shared: true },
  companySite: { shared: true, inherit: 'company' },
  person: { shared: true },
  personRole: { shared: true },
  personDocument: { shared: true },
  codiceSconto: { shared: true },
  preventivo: { shared: true, mixed: true }, // Può avere voci di entrambi i branch
  fattura: { shared: true, mixed: true },
  dvr: { shared: true },
  sopralluogo: { shared: true },
  cmsPage: { shared: true },
  cmsMedia: { shared: true },
  template: { shared: true },
  activityLog: { shared: true, trackBranch: true }, // Traccia branch ma non filtra
};

/**
 * Determina il branch dalla request
 * @param {Object} req - Express request
 * @returns {string|null} - 'MEDICA', 'FORMAZIONE', o null
 */
export function getBranchFromRequest(req) {
  // 1. Query parameter esplicito
  if (req.query.branchType) {
    return req.query.branchType.toUpperCase();
  }
  
  // 2. Header X-Frontend-Id
  const frontendId = req.headers['x-frontend-id'];
  if (frontendId) {
    if (frontendId === 'element-medica') return 'MEDICA';
    if (frontendId === 'element-formazione') return 'FORMAZIONE';
  }
  
  // 3. Analisi path
  const path = req.path.toLowerCase();
  if (path.includes('/clinica/') || path.includes('/prestazioni') || path.includes('/visite')) {
    return 'MEDICA';
  }
  if (path.includes('/corsi') || path.includes('/schedules') || path.includes('/attestati')) {
    return 'FORMAZIONE';
  }
  
  // 4. Fallback: tenant primaryBranch
  if (req.tenant?.primaryBranch) {
    return req.tenant.primaryBranch;
  }
  
  // 5. Nessun branch determinato
  return null;
}

/**
 * Verifica se l'utente ha accesso al branch richiesto
 * @param {Object} req - Express request
 * @param {string} branchType - Branch richiesto
 * @returns {boolean}
 */
export function canAccessBranch(req, branchType) {
  const user = req.user;
  
  // Admin globale può accedere a tutto (ma comunque tracciato)
  if (user.globalRole === 'ADMIN' || user.globalRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Verifica PersonTenantAccess.enabledBranches
  const tenantAccess = user.tenantAccess || req.tenantAccess;
  if (tenantAccess?.enabledBranches) {
    return tenantAccess.enabledBranches.includes(branchType);
  }
  
  // Verifica enabledBranches del tenant
  if (req.tenant?.enabledBranches) {
    return req.tenant.enabledBranches.includes(branchType);
  }
  
  return false;
}

/**
 * Genera filtro Prisma per branch
 * @param {string} entityName - Nome entità
 * @param {string} branchType - Branch corrente
 * @returns {Object} - Filtro Prisma da aggiungere a where
 */
export function getBranchFilter(entityName, branchType) {
  const config = BRANCH_CONFIG[entityName.toLowerCase()];
  
  if (!config) {
    logger.warn(`No branch config for entity: ${entityName}`);
    return {};
  }
  
  // Entità condivise: nessun filtro branch
  if (config.shared && !config.mixed) {
    return {};
  }
  
  // Entità miste (Preventivo): filtro opzionale
  if (config.mixed) {
    return branchType ? { branchTypes: { has: branchType } } : {};
  }
  
  // Entità branch-specific: filtro obbligatorio
  if (branchType) {
    return { branchType };
  }
  
  // Nessun branch specificato per entità branch-specific
  logger.warn(`No branchType specified for branch-specific entity: ${entityName}`);
  return {};
}

/**
 * Middleware per validare accesso branch
 */
export function requireBranchAccess(requiredBranch = null) {
  return (req, res, next) => {
    const branch = requiredBranch || getBranchFromRequest(req);
    
    if (!branch) {
      return next(); // Entità condivise non richiedono branch
    }
    
    if (!canAccessBranch(req, branch)) {
      return res.status(403).json({
        error: 'Branch access denied',
        code: 'BRANCH_ACCESS_DENIED',
        required: branch,
        available: req.tenantAccess?.enabledBranches || []
      });
    }
    
    req.branchType = branch;
    next();
  };
}

export default {
  BRANCH_CONFIG,
  getBranchFromRequest,
  canAccessBranch,
  getBranchFilter,
  requireBranchAccess
};
```

### Task 3.2: Aggiornare tenantHelper.js

**File**: `backend/utils/tenantHelper.js`

```javascript
// Aggiungere alle funzioni esistenti:

import { getBranchFromRequest, canAccessBranch, getBranchFilter } from './branchHelper.js';

/**
 * Ottiene i branch accessibili per l'utente nel tenant corrente
 * @param {Object} req - Express request
 * @returns {string[]} - Array di BranchType
 */
export function getAccessibleBranches(req) {
  const user = req.user;
  
  // Admin globale vede tutti i branch abilitati del tenant
  if (user.globalRole === 'ADMIN' || user.globalRole === 'SUPER_ADMIN') {
    return req.tenant?.enabledBranches || ['MEDICA', 'FORMAZIONE'];
  }
  
  // Utente normale: intersezione tra branch tenant e branch personali
  const tenantBranches = req.tenant?.enabledBranches || [];
  const userBranches = req.tenantAccess?.enabledBranches || [];
  
  return tenantBranches.filter(b => userBranches.includes(b));
}

/**
 * Costruisce where clause completa per query multi-tenant + branch
 * @param {Object} req - Express request
 * @param {string} entityName - Nome entità
 * @param {Object} additionalFilters - Filtri aggiuntivi
 * @returns {Object} - Where clause Prisma
 */
export function buildWhereClause(req, entityName, additionalFilters = {}) {
  const tenantId = getEffectiveTenantId(req);
  const branchType = getBranchFromRequest(req);
  const branchFilter = getBranchFilter(entityName, branchType);
  
  return {
    tenantId,
    deletedAt: null,
    ...branchFilter,
    ...additionalFilters
  };
}
```

### Task 3.3: Aggiornare brandDetection Middleware

**File**: `backend/middleware/brandDetection.js`

```javascript
// Aggiungere supporto per branch
import { getBranchFromRequest, getAccessibleBranches } from '../utils/branchHelper.js';

// Nel middleware esistente, dopo il rilevamento brand/tenant:

// Determina branch corrente
const branchType = getBranchFromRequest(req);
req.branchType = branchType;

// Carica branch accessibili dall'utente
if (req.user) {
  req.accessibleBranches = getAccessibleBranches(req);
}

logger.debug({
  frontendId,
  brandName,
  tenantId,
  branchType,
  accessibleBranches: req.accessibleBranches,
  path: req.path
});
```

---

## 📝 FASE 4: Backend Services (7 giorni)

### Task 4.1: Aggiornare Services Entità MEDICA

#### PrestazioneService.js

```javascript
// Modifiche chiave:

static async findAll(options, tenantId, branchType = 'MEDICA') {
  const where = {
    tenantId,
    branchType, // NUOVO
    deletedAt: null,
    ...options.filters
  };
  
  return prisma.prestazione.findMany({ where, ... });
}

static async create(data, tenantId, branchType = 'MEDICA', createdBy) {
  return prisma.prestazione.create({
    data: {
      ...data,
      tenantId,
      branchType, // NUOVO
      createdBy
    }
  });
}
```

#### OffertaBundleService.js

```javascript
// Già presente tenantId, aggiungere branchType

static async create(data, tenantId, createdBy = null) {
  // ... codice esistente ...
  
  // Aggiungere branchType
  const branchType = data.branchType || 'MEDICA';
  
  const bundle = await prisma.offertaBundle.create({
    data: {
      ...bundleData,
      tenantId,
      branchType, // NUOVO
      createdBy,
      // ... resto
    }
  });
}
```

### Task 4.2: Aggiornare Services Entità FORMAZIONE

#### CourseService.js

```javascript
static async findAll(options, tenantId, branchType = 'FORMAZIONE') {
  const where = {
    tenantId,
    branchType, // NUOVO
    deletedAt: null
  };
  
  return prisma.course.findMany({ where, ... });
}
```

### Task 4.3: Aggiornare Controllers

Ogni controller deve:
1. Estrarre `branchType` dalla request
2. Passarlo al service
3. Verificare accesso branch

```javascript
// Esempio: PrestazioneController.js

import { getBranchFromRequest, canAccessBranch } from '../utils/branchHelper.js';

export async function getAllPrestazioni(req, res) {
  const tenantId = getEffectiveTenantId(req);
  const branchType = getBranchFromRequest(req) || 'MEDICA';
  
  // Verifica accesso branch
  if (!canAccessBranch(req, branchType)) {
    return res.status(403).json({ error: 'Branch access denied' });
  }
  
  const prestazioni = await PrestazioneService.findAll(
    req.query,
    tenantId,
    branchType // NUOVO parametro
  );
  
  res.json({ data: prestazioni });
}
```

### Task 4.4: Aggiornare Routes

```javascript
// Aggiungere middleware requireBranchAccess

import { requireBranchAccess } from '../utils/branchHelper.js';

// Routes MEDICA
router.get('/clinica/prestazioni', 
  authenticate, 
  requireBranchAccess('MEDICA'), 
  prestazioneController.getAll
);

// Routes FORMAZIONE
router.get('/courses', 
  authenticate, 
  requireBranchAccess('FORMAZIONE'), 
  courseController.getAll
);

// Routes CONDIVISE (no branch check)
router.get('/companies', 
  authenticate, 
  companyController.getAll
);
```

---

## 📝 FASE 5: Frontend Adaptation (5 giorni)

### Task 5.1: Creare useBranch Hook

**File**: `src/hooks/useBranch.ts`

```typescript
import { useMemo } from 'react';
import { useBrandConfig } from './useBrandConfig';
import { useTenantFilter } from './useTenantFilter';

export type BranchType = 'MEDICA' | 'FORMAZIONE';

export function useBranch() {
  const { frontendId } = useBrandConfig();
  const { activeTenant } = useTenantFilter();
  
  const currentBranch = useMemo<BranchType | null>(() => {
    switch (frontendId) {
      case 'element-medica': return 'MEDICA';
      case 'element-formazione': return 'FORMAZIONE';
      default: return null;
    }
  }, [frontendId]);
  
  const accessibleBranches = useMemo<BranchType[]>(() => {
    return activeTenant?.enabledBranches || ['MEDICA', 'FORMAZIONE'];
  }, [activeTenant]);
  
  const canAccessBranch = (branch: BranchType) => {
    return accessibleBranches.includes(branch);
  };
  
  return {
    currentBranch,
    accessibleBranches,
    canAccessBranch,
    isMedica: currentBranch === 'MEDICA',
    isFormazione: currentBranch === 'FORMAZIONE'
  };
}
```

### Task 5.2: Aggiornare API Calls

**File**: `src/api/clinicaApi.ts`

```typescript
import { useBranch } from '../hooks/useBranch';

// Ogni API call deve includere branchType

export const prestazioniApi = {
  getAll: async (params: PrestazioniParams) => {
    const { currentBranch } = useBranch();
    return api.get('/clinica/prestazioni', {
      params: { 
        ...params, 
        branchType: currentBranch || 'MEDICA'
      }
    });
  },
  
  create: async (data: CreatePrestazioneDto) => {
    const { currentBranch } = useBranch();
    return api.post('/clinica/prestazioni', {
      ...data,
      branchType: currentBranch || 'MEDICA'
    });
  }
};
```

### Task 5.3: Aggiornare Route Guard

**File**: `src/components/guards/BranchGuard.tsx`

```typescript
import { useBranch } from '../../hooks/useBranch';
import { Navigate } from 'react-router-dom';

interface BranchGuardProps {
  requiredBranch: BranchType;
  children: React.ReactNode;
}

export function BranchGuard({ requiredBranch, children }: BranchGuardProps) {
  const { canAccessBranch } = useBranch();
  
  if (!canAccessBranch(requiredBranch)) {
    return (
      <Navigate 
        to="/access-denied" 
        state={{ reason: 'branch', required: requiredBranch }}
      />
    );
  }
  
  return <>{children}</>;
}
```

### Task 5.4: Aggiornare Navigation

**File**: `src/components/layout/Sidebar.tsx`

```typescript
// Filtrare menu items in base ai branch accessibili

const { accessibleBranches } = useBranch();

const filteredMenuItems = menuItems.filter(item => {
  if (item.branch && !accessibleBranches.includes(item.branch)) {
    return false;
  }
  return true;
});
```

---

## 📝 FASE 6: UI Multi-tenant Admin (3 giorni)

### Task 6.1: Tenant Selector con Branch Info

**File**: `src/components/admin/TenantSelector.tsx`

```typescript
export function TenantSelector() {
  const { accessibleTenants, selectTenant, currentTenant } = useTenantFilter();
  
  return (
    <Select value={currentTenant?.id} onValueChange={selectTenant}>
      {accessibleTenants.map(tenant => (
        <SelectItem key={tenant.id} value={tenant.id}>
          <div className="flex items-center gap-2">
            <span>{tenant.name}</span>
            <div className="flex gap-1">
              {tenant.enabledBranches.includes('MEDICA') && (
                <Badge variant="outline" className="bg-blue-50">M</Badge>
              )}
              {tenant.enabledBranches.includes('FORMAZIONE') && (
                <Badge variant="outline" className="bg-green-50">F</Badge>
              )}
            </div>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
}
```

### Task 6.2: Branch Switcher per Admin

**File**: `src/components/admin/BranchSwitcher.tsx`

```typescript
export function BranchSwitcher() {
  const { currentBranch, accessibleBranches, switchBranch } = useBranch();
  
  if (accessibleBranches.length <= 1) {
    return null; // Non mostrare se solo un branch
  }
  
  return (
    <div className="flex gap-2">
      {accessibleBranches.map(branch => (
        <Button
          key={branch}
          variant={currentBranch === branch ? 'default' : 'outline'}
          onClick={() => switchBranch(branch)}
        >
          {branch === 'MEDICA' ? '🏥 Medica' : '📚 Formazione'}
        </Button>
      ))}
    </div>
  );
}
```

### Task 6.3: Tenant Management con Branch Config

**File**: `src/pages/management/tenants/TenantBranchConfig.tsx`

```typescript
export function TenantBranchConfig({ tenant }: { tenant: Tenant }) {
  const [enabledBranches, setEnabledBranches] = useState(tenant.enabledBranches);
  
  const handleToggleBranch = async (branch: BranchType) => {
    const newBranches = enabledBranches.includes(branch)
      ? enabledBranches.filter(b => b !== branch)
      : [...enabledBranches, branch];
    
    await tenantsApi.update(tenant.id, { enabledBranches: newBranches });
    setEnabledBranches(newBranches);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Branch Abilitati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>🏥 Element Medica</Label>
            <Switch
              checked={enabledBranches.includes('MEDICA')}
              onCheckedChange={() => handleToggleBranch('MEDICA')}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>📚 Element Formazione</Label>
            <Switch
              checked={enabledBranches.includes('FORMAZIONE')}
              onCheckedChange={() => handleToggleBranch('FORMAZIONE')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 📝 FASE 7: Testing E2E (5 giorni)

### Task 7.1: Test Suite Branch Isolation

```javascript
// tests/e2e/branch-isolation.test.js

describe('Branch Isolation', () => {
  describe('Entità MEDICA', () => {
    it('should filter prestazioni by branchType MEDICA', async () => {
      const res = await api.get('/clinica/prestazioni', {
        headers: { 'X-Frontend-Id': 'element-medica' }
      });
      
      expect(res.data.data.every(p => p.branchType === 'MEDICA')).toBe(true);
    });
    
    it('should reject access to MEDICA from FORMAZIONE user', async () => {
      const formazioneUser = await loginAs('formazione-only-user');
      
      const res = await api.get('/clinica/prestazioni', {
        headers: { 
          'Authorization': `Bearer ${formazioneUser.token}`,
          'X-Frontend-Id': 'element-medica' 
        }
      });
      
      expect(res.status).toBe(403);
      expect(res.data.code).toBe('BRANCH_ACCESS_DENIED');
    });
  });
  
  describe('Entità FORMAZIONE', () => {
    it('should filter courses by branchType FORMAZIONE', async () => {
      const res = await api.get('/courses', {
        headers: { 'X-Frontend-Id': 'element-formazione' }
      });
      
      expect(res.data.data.every(c => c.branchType === 'FORMAZIONE')).toBe(true);
    });
  });
  
  describe('Entità CONDIVISE', () => {
    it('should show same CodiceSconto in both branches', async () => {
      // Crea sconto
      const sconto = await api.post('/codici-sconto', { codice: 'TEST10' });
      
      // Verifica visibile in MEDICA
      const resMedica = await api.get('/codici-sconto', {
        headers: { 'X-Frontend-Id': 'element-medica' }
      });
      expect(resMedica.data.data.some(s => s.id === sconto.data.id)).toBe(true);
      
      // Verifica visibile in FORMAZIONE
      const resForm = await api.get('/codici-sconto', {
        headers: { 'X-Frontend-Id': 'element-formazione' }
      });
      expect(resForm.data.data.some(s => s.id === sconto.data.id)).toBe(true);
    });
  });
});
```

### Task 7.2: Test Suite Admin Multi-Tenant

```javascript
describe('Admin Multi-Tenant Access', () => {
  let adminToken;
  
  beforeAll(async () => {
    adminToken = await loginAs('admin@example.com', 'Admin123!');
  });
  
  it('should access all tenants via PersonTenantAccess', async () => {
    const res = await api.get('/tenants', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    expect(res.data.data.length).toBeGreaterThan(1);
  });
  
  it('should switch tenant context', async () => {
    const tenants = await api.get('/person-tenant-access/my-tenants', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    expect(tenants.data.data.length).toBeGreaterThan(1);
  });
  
  it('should respect branch access per tenant', async () => {
    // Admin con accesso solo MEDICA su tenant X
    const res = await api.get('/courses', {
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-Id': 'tenant-solo-medica'
      }
    });
    
    expect(res.status).toBe(403);
  });
});
```

### Task 7.3: Test UI E2E (Playwright)

```typescript
// tests/e2e/ui/branch-navigation.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Branch Navigation UI', () => {
  test('should show only MEDICA menu items on element-medica', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await login(page, 'admin@example.com', 'Admin123!');
    
    // Verifica menu MEDICA visibili
    await expect(page.getByText('Prestazioni')).toBeVisible();
    await expect(page.getByText('Visite')).toBeVisible();
    
    // Verifica menu FORMAZIONE non visibili
    await expect(page.getByText('Corsi')).not.toBeVisible();
    await expect(page.getByText('Schedules')).not.toBeVisible();
  });
  
  test('should show branch switcher for admin', async ({ page }) => {
    await page.goto('http://localhost:5174');
    await login(page, 'admin@example.com', 'Admin123!');
    
    // Admin vede switcher
    await expect(page.getByTestId('branch-switcher')).toBeVisible();
  });
  
  test('should create bundle in correct branch', async ({ page }) => {
    await page.goto('http://localhost:5174/clinica/catalogo/bundle/nuovo');
    await login(page, 'admin@example.com', 'Admin123!');
    
    // Compila form
    await page.fill('[name="nome"]', 'Test Bundle');
    await page.fill('[name="prezzoBundle"]', '100');
    await page.click('button[type="submit"]');
    
    // Verifica creazione
    await expect(page.getByText('Bundle creato con successo')).toBeVisible();
  });
});
```

### Task 7.4: Checklist Validazione Finale

```markdown
## ✅ Checklist Validazione Fase 7

### Schema & Migrazione
- [ ] Enum BranchType creato
- [ ] Tenant.enabledBranches funzionante
- [ ] PersonTenantAccess.enabledBranches funzionante
- [ ] Tutti i record esistenti migrati correttamente
- [ ] Indici su branchType creati

### Backend
- [ ] BranchHelper.js testato
- [ ] Tutti i Services aggiornati
- [ ] Tutti i Controllers aggiornati
- [ ] Middleware requireBranchAccess funzionante
- [ ] API returns 403 su branch non autorizzato

### Frontend
- [ ] useBranch hook funzionante
- [ ] BranchGuard component funzionante
- [ ] Navigation filtrata per branch
- [ ] API calls includono branchType
- [ ] TenantSelector mostra branch

### Admin Multi-Tenant
- [ ] Admin può vedere tutti i tenant
- [ ] Admin può switchare tenant
- [ ] Admin rispetta branch limits per tenant
- [ ] Audit log traccia branch

### Configurazioni Commerciali
- [ ] Solo Medica: OK
- [ ] Solo Formazione: OK
- [ ] Full Suite: OK
- [ ] Upgrade/Downgrade funzionante
```

---

## 📊 Metriche di Successo

| Metrica | Target | Come Verificare |
|---------|--------|-----------------|
| Zero data leaks | 100% | Test isolation branch |
| API response time | < 100ms | Load test |
| Test coverage | > 80% | npm run test:coverage |
| Zero errori TypeScript | 0 | npm run typecheck |
| UI responsive | < 3s FCP | Lighthouse |

---

## 🔄 Rollback Plan

In caso di problemi critici:

1. **Rollback Database**
```bash
psql -h localhost -U postgres -d element_medica < backup_pre_phase1.sql
```

2. **Rollback Code**
```bash
git revert --no-commit HEAD~N  # N = numero commit da fase
git commit -m "Rollback Progetto 45"
```

3. **Feature Flags** (se implementati)
```javascript
// Disabilita nuova logica branch
process.env.ENABLE_BRANCH_SYSTEM = 'false';
```

---

## 📅 Timeline Riepilogativa

```
Settimana 1: Fase 1 (Schema) + Fase 2 (Migrazione)
Settimana 2: Fase 3 (Backend Core)
Settimana 3: Fase 4 (Backend Services)
Settimana 4: Fase 5 (Frontend) + Fase 6 (UI Admin)
Settimana 5: Fase 7 (Testing E2E)
Settimana 6: Buffer + Go Live
```

---

## ✅ Approvazione

| Ruolo | Nome | Data | Firma |
|-------|------|------|-------|
| Tech Lead | | | |
| Product Owner | | | |
| QA Lead | | | |
| DevOps | | | |

---

*Documento generato il 29/12/2025 - Progetto 45 ElementMedica*
