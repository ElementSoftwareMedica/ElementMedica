# 🏗️ System Architecture - ElementMedica

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Panoramica

> **P64**: Proxy server (4003) ELIMINATO - In dev Vite proxy, in prod Nginx routing diretto.

ElementMedica utilizza un'architettura a due server ottimizzata per garantire:
- **Modularità**: Middleware e configurazioni separate
- **Performance**: Riduzione codice del 63%
- **Sicurezza**: CORS centralizzato, rate limiting, security headers
- **Manutenibilità**: Architettura completamente modulare
- **Conformità GDPR**: Audit trail, soft delete, consent tracking

---

## 🏛️ Architettura Generale

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                 │
│              Port 5173 (dev) / Nginx (prod)                │
│  • React 18 + TypeScript                                   │
│  • TailwindCSS                                             │
│  • React Query                                             │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    ┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
    │  API SERVER   │ │   DOCUMENTS   │ │    REDIS      │
    │   Port 4001   │ │    SERVER     │ │   Port 6379   │
    │               │ │   Port 4002   │ │               │
    │ • Express     │ │ • PDF gen     │ │ • Sessions    │
    │ • Prisma ORM  │ │ • Puppeteer   │ │ • Cache       │
    │ • JWT Auth    │ │ • File upload │ │ • Rate limit  │
    │ • RBAC        │ └───────────────┘ └───────────────┘
    │ • GDPR        │
    │ • CORS        │
    └───────┬───────┘
            │
    ┌───────▼───────┐
    │  PostgreSQL   │
    │   (Supabase)  │
    │               │
    │ • 59 modelli  │
    │ • 24 enums    │
    │ • 150+ index  │
    └───────────────┘
```

---

## 🔧 Server Components

### API Server (Port 4001)

**Ruolo**: Core business logic, API REST e CORS handling

**Struttura**:
```
backend/servers/api/
├── managers/
│   ├── ServiceLifecycleManager.js  # Gestione servizi
│   ├── MiddlewareManager.js        # Middleware centralizzati
│   └── APIVersionManager.js        # Versioning API
├── middleware/
│   └── performanceMiddleware.js    # Performance monitoring
└── server.js                       # Entry point (195 righe)
```

**Endpoints Principali**:
- `/api/v1/auth/*` - Autenticazione
- `/api/v1/persons/*` - Gestione persone
- `/api/v1/companies/*` - Gestione aziende
- `/api/v1/courses/*` - Gestione corsi
- `/api/v1/clinica/*` - Modulo clinica (visite, prestazioni, MDL)
- `/api/v1/admin/*` - Funzioni amministrative

> **P64**: CORS, rate limiting e security headers ora gestiti direttamente da API Server.

### Documents Server (Port 4002)

**Ruolo**: Gestione documenti e generazione PDF

**Features**:
- Puppeteer browser pool per PDF
- Upload/download file
- Template management
- Generazione attestati
- Lettere incarico

---

## 🗄️ Database Schema

### Statistiche

| Metrica | Valore |
|---------|--------|
| **Modelli** | 59 |
| **Enum** | 24 |
| **Indici** | 150+ |
| **Linee Schema** | 2,071 |

### Categorie Entità

| Categoria | Modelli | Esempi |
|-----------|---------|--------|
| **Core Formazione** | 8 | Course, CourseSchedule, Attestato |
| **Core Clinica** | 15+ | Visita, Prestazione, Appuntamento |
| **Anagrafiche** | 4 | Person, Company, CompanySite |
| **Auth & RBAC** | 7 | PersonRole, RolePermission |
| **Tenant & Config** | 4 | Tenant, TenantConfiguration |
| **GDPR & Audit** | 4 | GdprAuditLog, ConsentRecord |
| **CMS & Forms** | 9 | CMSPage, form_templates |
| **Billing** | 8 | Fattura, Preventivo, CodiceSconto |

### Pattern Multi-Tenant (P48/P49)

```
┌─────────────────────────────────────────┐
│           PERSON (Globale)              │
│  taxCode, firstName, lastName, username │
└─────────────────┬───────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────┐
│      PERSON TENANT PROFILE              │
│  email, phone, status, hourlyRate       │
│  (dati specifici per tenant)            │
└─────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────┐
│           COMPANY (Globale)             │
│  piva, ragioneSociale, codiceFiscale    │
└─────────────────┬───────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────┐
│      COMPANY TENANT PROFILE             │
│  referenteId, contratto, condizioni     │
│  (dati commerciali per tenant)          │
└─────────────────┬───────────────────────┘
                  │ 1:N
                  ▼
┌─────────────────────────────────────────┐
│         COMPANY SITE                    │
│  indirizzo, DVR, RSPP, MC               │
└─────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

### Authentication Flow

> **P64**: Proxy server eliminato - richieste dirette ad API Server

```
Client → Vite Proxy (dev) / Nginx (prod) → API (4001)
           │
           ├── Rate Limit Check
           ├── CORS Validation
           └── JWT Verification
                    │
                    ├── req.person.tenantId
                    ├── req.person.id
                    └── Permission Check
```

### Middleware Stack

**API Level** (ora include anche funzionalità ex-Proxy):
   - `cors.js` - CORS handling
   - `rateLimiting.js` - Request throttling
   - `security.js` - Helmet headers
   - `auth.js` - JWT verification → `req.person`
   - `rbac.js` - Permission checks
   - `tenantMode.js` - Tenant validation
   - `featureFlags.js` - Feature access

---

## 🌐 Multi-Frontend Architecture

### Domini

| Dominio | Applicazione | Porta Dev |
|---------|--------------|-----------|
| elementsicurezza.com | CRM/Backoffice | 5173 |
| elementmedica.com | Frontend Pubblico | 5174 |

### Brand Detection

```javascript
// X-Frontend-Id header determina SOLO UI
const brandConfig = {
  'element-sicurezza': { branchType: 'FORMAZIONE' },
  'element-medica': { branchType: 'MEDICA' }
};

// TENANT sempre da JWT (req.person.tenantId)
// Brand ≠ Tenant (P57)
```

---

## 📊 API Versioning

| Versione | Path | Stato |
|----------|------|-------|
| **v1** | `/api/v1/*` | Attivo (principale) |
| **v2** | `/api/v2/*` | Riservato |

Header automatico: `x-api-version: v1`

---

*Documento aggiornato il 22 Gennaio 2026*
