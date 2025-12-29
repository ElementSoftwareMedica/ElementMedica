# 🏢 Progetto 45 - Ristrutturazione Tenant per Commercializzazione

**Data Creazione**: 29 dicembre 2025  
**Ultimo Aggiornamento**: 29 dicembre 2025  
**Stato**: 📋 PIANIFICAZIONE COMPLETA  
**Priorità**: CRITICA  
**Architettura Scelta**: **OPZIONE 2 - Customer as Tenant**

---

## 📋 Executive Summary

### Decisione Architetturale

Dopo analisi approfondita, si adotta l'**Opzione 2: Un Tenant per Cliente** perché:

1. ✅ **Più pulita**: Un cliente = Un tenant = Una fattura
2. ✅ **Scalabile**: Facile aggiungere nuovi branch (LABORATORY, CONSULTING)
3. ✅ **Nessuna duplicazione**: Entità condivise (Company, Person, CodiceSconto) esistono una sola volta
4. ✅ **Gestione semplificata**: Admin gestisce un solo tenant per cliente
5. ✅ **Multi-tenant nativo per Admin**: Tramite PersonTenantAccess già implementato

### Configurazioni Commerciali Supportate

| Configurazione | Branch Abilitati | Frontend | Prezzo |
|----------------|------------------|----------|--------|
| **Starter Medica** | `[MEDICA]` | 5174 | €99/mese |
| **Starter Formazione** | `[FORMAZIONE]` | 5173 | €99/mese |
| **Professional** | Uno a scelta + CMS | Entrambi | €199/mese |
| **Enterprise** | `[MEDICA, FORMAZIONE]` | Entrambi | €399/mese |

---

## 🎯 Obiettivi del Progetto

### Requisiti Commerciali

| Configurazione | Tenant | Frontend | Funzionalità |
|----------------|--------|----------|--------------|
| **Medica Only** | 1 tenant | Porta 5174 | Medicina, Poliambulatorio, Management |
| **Formazione Only** | 1 tenant | Porta 5173 | Corsi, Schedules, Management |
| **Full Suite** | 2 tenant | Entrambe porte | Tutte le funzionalità + condivisione dati |

### Problema Chiave da Risolvere

> **Risorse Condivise**: Entità come `CodiceSconto`, `Company`, `Person` devono essere visibili/condivise tra Element Medica e Element Formazione per la stessa azienda cliente, ma **NON** con altri clienti (tenant).

---

## 🏗️ Analisi Architettura Attuale

### Stato Corrente

```
┌─────────────────────────────────────────────────────────────┐
│                   ARCHITETTURA ATTUALE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Element Formazione│  │  Element Medica  │               │
│  │  (5173 → 4003)   │  │   (5174 → 4003)  │               │
│  └────────┬─────────┘  └────────┬─────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      ▼                                      │
│           ┌──────────────────┐                             │
│           │   Proxy (4003)   │                             │
│           │  Brand Detection │                             │
│           └────────┬─────────┘                             │
│                    ▼                                        │
│           ┌──────────────────┐                             │
│           │   API (4001)     │                             │
│           │  Multi-Tenant    │                             │
│           └────────┬─────────┘                             │
│                    ▼                                        │
│           ┌──────────────────┐                             │
│           │   PostgreSQL     │                             │
│           │   3 Tenants      │                             │
│           └──────────────────┘                             │
│                                                             │
│  TENANTS:                                                   │
│  • bca8dc20... (Default Company) - Admin globale           │
│  • da59b77a... (Element Formazione)                        │
│  • 21ec594c... (Element Medica)                            │
│                                                             │
│  PROBLEMI:                                                  │
│  ❌ Ogni tenant è isolato al 100%                          │
│  ❌ CodiceSconto non condivisibile tra brand               │
│  ❌ Company non condivisibile tra brand                    │
│  ❌ Person (cliente/paziente) duplicato                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### PersonTenantAccess (Già Implementato)

```prisma
model PersonTenantAccess {
  id           String            @id @default(uuid())
  personId     String
  tenantId     String
  accessLevel  TenantAccessLevel @default(READ)
  features     String[]          @default([])
  isPrimary    Boolean           @default(false)
  validFrom    DateTime          @default(now())
  validUntil   DateTime?
  // ...
}

enum TenantAccessLevel {
  READ
  WRITE
  ADMIN
}
```

---

## 🔍 Analisi delle Due Opzioni Architetturali

### OPZIONE 1: Ogni Ramo Aziendale = Un Tenant

```
┌─────────────────────────────────────────────────────────────┐
│              OPZIONE 1: BRANCH-AS-TENANT                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cliente: "Clinica Rossi Srl"                               │
│                                                             │
│  ┌─────────────────────┐   ┌─────────────────────┐        │
│  │ Tenant: Rossi-Med   │   │ Tenant: Rossi-Form  │        │
│  │ (Medica)            │   │ (Formazione)        │        │
│  │                     │   │                     │        │
│  │ • Prestazioni       │   │ • Corsi             │        │
│  │ • Visite           │   │ • Schedules         │        │
│  │ • Bundle           │   │ • Attestati         │        │
│  └──────────┬──────────┘   └──────────┬──────────┘        │
│             │                          │                   │
│             └──────────┬───────────────┘                   │
│                        ▼                                    │
│             ┌──────────────────────┐                       │
│             │  PersonTenantAccess  │                       │
│             │  (Cross-Tenant Link) │                       │
│             └──────────────────────┘                       │
│                                                             │
│  PRO:                                                       │
│  ✅ Isolamento dati nativo (tenantId su ogni riga)         │
│  ✅ PersonTenantAccess già implementato                    │
│  ✅ Nessuna modifica allo schema DB                        │
│  ✅ Scalabilità per nuovi clienti                          │
│                                                             │
│  CONTRO:                                                    │
│  ❌ Entità condivise richiedono duplicazione               │
│  ❌ CodiceSconto duplicato per brand                       │
│  ❌ Company duplicata per brand                            │
│  ❌ Sincronizzazione manuale tra tenant                    │
│  ❌ 2 tenant per cliente = 2x complessità admin            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### OPZIONE 2: Un Tenant per Azienda Cliente

```
┌─────────────────────────────────────────────────────────────┐
│              OPZIONE 2: CUSTOMER-AS-TENANT                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cliente: "Clinica Rossi Srl"                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tenant: clinica-rossi                               │   │
│  │                                                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐          │   │
│  │  │ Branch: Medica  │  │ Branch: Formaz. │          │   │
│  │  │ (PersonRole.    │  │ (PersonRole.    │          │   │
│  │  │  features)      │  │  features)      │          │   │
│  │  └─────────────────┘  └─────────────────┘          │   │
│  │                                                     │   │
│  │  Entità Condivise (singola copia):                 │   │
│  │  • CodiceSconto                                    │   │
│  │  • Company                                         │   │
│  │  • Person (pazienti/dipendenti)                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PRO:                                                       │
│  ✅ Entità condivise nativamente                           │
│  ✅ Un solo tenant per cliente                             │
│  ✅ Gestione semplificata                                  │
│  ✅ CodiceSconto unico per tutto il cliente                │
│                                                             │
│  CONTRO:                                                    │
│  ❌ Richiede nuovo campo "branchType" su molte entità      │
│  ❌ Richiede refactoring significativo                     │
│  ❌ PersonRole.features deve gestire accesso branch        │
│  ❌ Brand detection più complessa                          │
│  ❌ Rischio di vedere dati del branch sbagliato            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏆 OPZIONE RACCOMANDATA: Ibrida (1.5)

### Tenant per Azienda + Branch Features

```
┌─────────────────────────────────────────────────────────────┐
│           OPZIONE IBRIDA: TENANT + BRANCH FEATURES           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Cliente: "Clinica Rossi Srl"                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Tenant: clinica-rossi-srl                           │   │
│  │ enabledBranches: ['MEDICA', 'FORMAZIONE']           │   │
│  │                                                     │   │
│  │  ENTITÀ CON branchType:                            │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │ Prestazione { tenantId, branchType: MEDICA }│   │   │
│  │  │ Corso { tenantId, branchType: FORMAZIONE }  │   │   │
│  │  │ Schedule { tenantId, branchType: FORMAZIONE}│   │   │
│  │  │ VisitaMedica { tenantId, branchType: MEDICA}│   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ENTITÀ CONDIVISE (branchType: null):              │   │
│  │  ┌────────────────────────────────────────────┐   │   │
│  │  │ CodiceSconto { tenantId, branchType: null } │   │   │
│  │  │ Company { tenantId, branchType: null }      │   │   │
│  │  │ Person { tenantId, branchType: null }       │   │   │
│  │  │ Template { tenantId, branchType: null }     │   │   │
│  │  └────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ACCESSO UTENTE:                                   │   │
│  │  PersonRole.features: ['MEDICA', 'FORMAZIONE']     │   │
│  │  └── Vede entità del branch assegnato              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PRO:                                                       │
│  ✅ Entità condivise nativamente (tenantId unico)          │
│  ✅ Isolamento branch tramite branchType                   │
│  ✅ PersonRole.features già esistente                      │
│  ✅ Un tenant = un cliente = fatturazione semplice         │
│  ✅ Scalabilità per nuovi branch (es: LABORATORY)          │
│                                                             │
│  IMPLEMENTAZIONE:                                           │
│  1. Aggiungere enum BranchType { MEDICA, FORMAZIONE }      │
│  2. Aggiungere branchType? su entità branch-specific       │
│  3. Modificare query per filtrare anche per branchType     │
│  4. Aggiungere enabledBranches[] su Tenant                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Matrice Entità per Branch

### Entità Branch-Specific (richiedono branchType)

| Entità | Branch | Motivazione |
|--------|--------|-------------|
| `Prestazione` | MEDICA | Solo per medicina |
| `OffertaBundle` | MEDICA | Solo per medicina |
| `VisitaMedica` | MEDICA | Solo per medicina |
| `ConvenzionePersona` | MEDICA | Solo per medicina |
| `ListinoPrezzo` | MEDICA | Solo per medicina |
| `Course` | FORMAZIONE | Solo per formazione |
| `Schedule` | FORMAZIONE | Solo per formazione |
| `Attestato` | FORMAZIONE | Solo per formazione |
| `RegistroPresenze` | FORMAZIONE | Solo per formazione |
| `CourseTest` | FORMAZIONE | Solo per formazione |

### Entità Condivise (branchType: null o assente)

| Entità | Motivazione |
|--------|-------------|
| `CodiceSconto` | Un codice sconto vale per tutto il cliente |
| `Company` | Un'azienda cliente è unica |
| `CompanySite` | Un sito aziendale è unico |
| `Person` | Un dipendente/paziente è unico |
| `PersonRole` | I ruoli sono trasversali |
| `Template` | I template sono condivisi |
| `Document` | I documenti sono condivisi |
| `Setting` | Le impostazioni sono globali |

### Entità Context-Dependent (branchType da contesto)

| Entità | Logica |
|--------|--------|
| `Preventivo` | Eredita branch dal tipo di voci (prestazioni vs corsi) |
| `Submission` | Eredita branch dal form template |
| `ActivityLog` | Registra il branch dell'azione |

---

## 🗓️ Piano di Implementazione

### FASE 1: Preparazione Schema (Settimana 1)

#### 1.1 Aggiungere Enum BranchType
```prisma
enum BranchType {
  MEDICA
  FORMAZIONE
  // Futuro: LABORATORY, CONSULTING, etc.
}
```

#### 1.2 Modificare Tenant
```prisma
model Tenant {
  // ... campi esistenti
  enabledBranches BranchType[] @default([MEDICA, FORMAZIONE])
  primaryBranch   BranchType?  // Per UI/routing default
}
```

#### 1.3 Aggiungere branchType alle entità

```prisma
model Prestazione {
  // ... campi esistenti
  branchType BranchType @default(MEDICA)
}

model Course {
  // ... campi esistenti
  branchType BranchType @default(FORMAZIONE)
}
```

### FASE 2: Backend Services (Settimana 2)

#### 2.1 Creare BranchHelper
```javascript
// backend/utils/branchHelper.js

export function getBranchFromRequest(req) {
  // 1. Controlla header X-Frontend-Id
  // 2. Controlla path (/clinica/* = MEDICA, /corsi/* = FORMAZIONE)
  // 3. Controlla query parameter ?branch=
  // 4. Fallback: tenant.primaryBranch
}

export function getBranchFilter(req, entity) {
  const branch = getBranchFromRequest(req);
  const entityConfig = BRANCH_CONFIG[entity];
  
  if (entityConfig.shared) {
    return {}; // Entità condivisa, no filtro branch
  }
  
  return { branchType: branch };
}
```

#### 2.2 Modificare Services

Per ogni service di entità branch-specific:
```javascript
// Esempio: PrestazioneService.js
static async findAll(options, tenantId, branchType) {
  return prisma.prestazione.findMany({
    where: {
      tenantId,
      branchType, // NUOVO
      deletedAt: null
    }
  });
}
```

### FASE 3: Frontend Adaptation (Settimana 3)

#### 3.1 Aggiornare TenantFilterContext

```typescript
// hooks/useBranchFilter.ts
export function useBranchFilter() {
  const { frontendId } = useBrandConfig();
  
  const branchType = useMemo(() => {
    switch (frontendId) {
      case 'element-medica': return 'MEDICA';
      case 'element-formazione': return 'FORMAZIONE';
      default: return null;
    }
  }, [frontendId]);
  
  return { branchType };
}
```

#### 3.2 Modificare API Calls

```typescript
// api/prestazioniApi.ts
export const getAll = (params) => {
  const { branchType } = useBranchFilter();
  return api.get('/prestazioni', {
    params: { ...params, branchType }
  });
};
```

### FASE 4: Migrazione Dati (Settimana 4)

#### 4.1 Script di Migrazione

```javascript
// scripts/migrate-branch-types.js

// 1. Impostare branchType=MEDICA per tutte le prestazioni
await prisma.prestazione.updateMany({
  where: { tenantId: { in: medicaTenantIds } },
  data: { branchType: 'MEDICA' }
});

// 2. Impostare branchType=FORMAZIONE per tutti i corsi
await prisma.course.updateMany({
  where: { tenantId: { in: formazioneTenantIds } },
  data: { branchType: 'FORMAZIONE' }
});

// 3. Unificare tenant per cliente (se necessario)
```

### FASE 5: Testing e Validazione (Settimana 5)

- [ ] Test isolamento branch (utente MEDICA non vede corsi)
- [ ] Test entità condivise (CodiceSconto visibile ovunque)
- [ ] Test cross-branch access per admin
- [ ] Test configurazione cliente "solo Medica"
- [ ] Test configurazione cliente "solo Formazione"
- [ ] Test configurazione cliente "Full Suite"

---

## 📈 Impatto Commerciale

### Modelli di Pricing Supportati

| Piano | Branches | Features | Prezzo Indicativo |
|-------|----------|----------|-------------------|
| **Starter Medica** | MEDICA | Prestazioni, Visite | €99/mese |
| **Starter Formazione** | FORMAZIONE | Corsi, Schedules | €99/mese |
| **Professional** | Uno a scelta | + CMS, Templates | €199/mese |
| **Enterprise** | Entrambi | + Management, API | €399/mese |

### Flusso Onboarding Nuovo Cliente

```
1. Cliente si registra → Crea Tenant con nome azienda
2. Seleziona piano → enabledBranches impostato
3. Admin crea utenti → PersonRole.features assegnato
4. Utente accede → Vede solo le pagine del suo branch
```

---

## ⚠️ Rischi e Mitigazioni

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| Migrazione dati complessa | ALTO | Script automatizzato + backup |
| Breaking changes API | MEDIO | Versioning API (v2) |
| Confusione utenti | BASSO | UI chiara con indicator branch |
| Performance query | BASSO | Index su branchType |

---

## 📋 Checklist Pre-Implementazione

- [ ] Review schema Prisma completo
- [ ] Mapping tutte le entità → branch/shared
- [ ] Definire comportamento entità ambigue
- [ ] Preparare script migrazione
- [ ] Definire strategia rollback
- [ ] Comunicare timeline a stakeholder

---

## 🔗 Documenti Correlati

- [PLANNING_DETTAGLIATO.md](../43_tenant_roles_management_system/PLANNING_DETTAGLIATO.md) - Sistema Tenant/Roles esistente
- [TASK_TRACKER.md](../43_tenant_roles_management_system/TASK_TRACKER.md) - Stato implementazione P43
- [copilot-instructions.md](../../../.github/copilot-instructions.md) - Regole progetto

---

## 📅 Timeline Stimata

| Fase | Durata | Dipendenze |
|------|--------|------------|
| Fase 1: Schema | 5 giorni | - |
| Fase 2: Backend | 5 giorni | Fase 1 |
| Fase 3: Frontend | 5 giorni | Fase 2 |
| Fase 4: Migrazione | 3 giorni | Fase 3 |
| Fase 5: Testing | 5 giorni | Fase 4 |
| **Totale** | **~5 settimane** | - |

---

## ✅ Prossimi Passi

1. **Approvazione** - Validare architettura ibrida con stakeholder
2. **POC** - Prototipo su 1-2 entità (Prestazione, Course)
3. **Full Implementation** - Seguire piano fasi
4. **Go Live** - Deploy progressivo per cliente test
