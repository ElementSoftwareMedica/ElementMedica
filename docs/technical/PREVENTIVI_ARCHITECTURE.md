# Architettura - Preventivi e Codici Sconto

## 📋 Overview

Documentazione tecnica completa dell'architettura del modulo **Preventivi e Codici Sconto** in ElementMedica 2.0.

### Obiettivi Architetturali

- ✅ **Isolamento Multi-Tenant**: Separazione totale dati per tenant
- ✅ **RBAC Granulare**: Controllo accessi basato su ruoli e permessi
- ✅ **GDPR Compliance**: Audit logging, soft delete, data minimization
- ✅ **Scalabilità**: Architettura stateless, cluster-ready
- ✅ **Manutenibilità**: Separazione concerns, DI, testabilità

---

## 🏗️ Stack Tecnologico

### Backend
- **Runtime**: Node.js 20.x LTS
- **Framework**: Express.js 4.x
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 15.x
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi / Zod
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer

### Frontend
- **Framework**: React 18.x + TypeScript
- **Build Tool**: Vite 5.x
- **State Management**: React Query + Zustand
- **UI Library**: Tailwind CSS + shadcn/ui
- **Forms**: React Hook Form
- **Routing**: React Router 6.x

### Infrastructure
- **Server**: Hetzner Cloud / Ubuntu 22.04
- **Reverse Proxy**: Nginx 1.18+
- **Process Manager**: PM2 (cluster mode)
- **SSL**: Let's Encrypt
- **Monitoring**: PM2 Plus / Grafana

---

## 📊 Database Schema (ERD)

```mermaid
erDiagram
    CODICI_SCONTO ||--o{ CODICE_AZIENDA : "applicabile a"
    CODICI_SCONTO ||--o{ CODICE_PERSONA : "applicabile a"
    CODICI_SCONTO ||--o{ CODICE_CORSO : "applicabile a"
    CODICI_SCONTO ||--o{ PREVENTIVO_SCONTO : "usato in"
    
    PREVENTIVI ||--o{ PREVENTIVO_SCONTO : "ha sconti"
    PREVENTIVI }o--|| AZIENDA : "cliente"
    PREVENTIVI }o--|| PERSONA : "cliente"
    PREVENTIVI }o--o| CORSO : "servizio"
    
    TENANTS ||--o{ CODICI_SCONTO : "isolamento"
    TENANTS ||--o{ PREVENTIVI : "isolamento"
    TENANTS ||--o{ AZIENDA : "isolamento"
    TENANTS ||--o{ PERSONA : "isolamento"
    
    PERSONS ||--o{ CODICI_SCONTO : "createdBy"
    PERSONS ||--o{ PREVENTIVI : "createdBy"
    PERSONS ||--o{ PREVENTIVO_SCONTO : "applicatoDa"
    
    GDPR_AUDIT_LOG ||--o{ CODICI_SCONTO : "audita"
    GDPR_AUDIT_LOG ||--o{ PREVENTIVI : "audita"

    CODICI_SCONTO {
        uuid id PK
        string codice UK
        string nome
        text descrizione
        enum tipoSconto
        decimal valore
        datetime dataInizio
        datetime dataFine
        boolean attivo
        int utilizzoMassimo
        int utilizzoCorrente
        int utilizzoPerUtente
        boolean cumulabile
        decimal minImporto
        decimal maxImporto
        enum applicabileA
        jsonb applicabileServizi
        uuid tenantId FK
        uuid createdBy FK
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }
    
    CODICE_AZIENDA {
        uuid id PK
        uuid codiceId FK
        uuid aziendaId FK
    }
    
    CODICE_PERSONA {
        uuid id PK
        uuid codiceId FK
        uuid personaId FK
    }
    
    CODICE_CORSO {
        uuid id PK
        uuid codiceId FK
        uuid corsoId FK
    }
    
    PREVENTIVI {
        uuid id PK
        string numero UK
        enum tipoServizio
        string titoloServizio
        text descrizioneServizio
        decimal prezzoTotale
        decimal speseAccessorie
        decimal subtotale
        decimal scontoTotale
        decimal imponibile
        decimal aliquotaIva
        decimal importoIva
        decimal importoFinale
        datetime dataEmissione
        datetime dataValidita
        enum stato
        uuid aziendaId FK
        uuid personaId FK
        uuid corsoId FK
        uuid programmazioneEventId FK
        jsonb metaPreventivo
        text note
        string pdfUrl
        uuid emailInviatoDa FK
        datetime emailInviatoIl
        uuid accettatoDa FK
        datetime accettatoIl
        uuid tenantId FK
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }
    
    PREVENTIVO_SCONTO {
        uuid id PK
        uuid preventivoId FK
        uuid codiceId FK
        string codiceTesto
        string nomeCodice
        text descrizioneCodice
        enum tipoSconto
        decimal valoreSconto
        decimal importoScontato
        uuid applicatoDa FK
        datetime applicatoIl
    }
    
    GDPR_AUDIT_LOG {
        uuid id PK
        enum action
        string tableName
        uuid recordId
        jsonb changes
        uuid performedBy FK
        datetime performedAt
        uuid tenantId FK
        string ipAddress
        string userAgent
    }
```

### Schema Notes

**Chiavi Univoche**:
- `codici_sconto.codice`: Univoco per tenant (non globale)
- `preventivi.numero`: Univoco globale (formato: `PREV-YYYY-NNNN`)

**Soft Delete**:
- Tutte le tabelle hanno `deletedAt` per GDPR compliance
- Query filtrano automaticamente `WHERE deletedAt IS NULL`

**Multi-Tenancy**:
- `tenantId` su tutte le entità principali
- Middleware verifica `req.user.tenantId` = `resource.tenantId`

---

## 🔄 Flussi Applicativi

### 1. Creazione Codice Sconto

```mermaid
sequenceDiagram
    actor Admin
    participant Frontend
    participant API
    participant Auth
    participant RBAC
    participant CodiceService
    participant Prisma
    participant AuditLog
    participant DB

    Admin->>Frontend: Compila form codice
    Frontend->>API: POST /api/codici-sconto
    API->>Auth: Verifica JWT token
    Auth-->>API: User + TenantId
    API->>RBAC: Check permission "codici_sconto_create"
    RBAC-->>API: ✅ Autorizzato
    
    API->>CodiceService: createCodice(data, userId, tenantId)
    CodiceService->>CodiceService: Valida business rules
    
    alt Codice duplicato
        CodiceService-->>API: Error 409
        API-->>Frontend: "Codice già esistente"
    else Validazione OK
        CodiceService->>Prisma: codici_sconto.create()
        Prisma->>DB: INSERT INTO codici_sconto
        DB-->>Prisma: Record creato
        Prisma-->>CodiceService: CodiceSconto
        
        CodiceService->>AuditLog: Log CREATE action
        AuditLog->>DB: INSERT INTO gdpr_audit_log
        
        CodiceService-->>API: Success + Data
        API-->>Frontend: 201 Created
        Frontend-->>Admin: "Codice creato con successo"
    end
```

**Business Rules Validate**:
1. `codice` univoco per tenant
2. `dataFine` > `dataInizio`
3. `valore` > 0
4. Se `tipoSconto = PERCENTUALE`: `valore` ≤ 100
5. `minImporto` < `maxImporto` (se entrambi definiti)
6. Se `applicabileA = AZIENDE_SPECIFICHE`: almeno 1 azienda collegata

---

### 2. Applicazione Sconto a Preventivo

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant Auth
    participant PreventivoService
    participant CodiceService
    participant Prisma
    participant DB

    User->>Frontend: Seleziona codice da dropdown
    Frontend->>API: POST /preventivi/:id/applica-sconto {codiceId}
    API->>Auth: Verifica JWT
    Auth-->>API: userId, tenantId
    
    API->>PreventivoService: applicaSconto(preventivoId, codiceId, userId)
    PreventivoService->>Prisma: Fetch preventivo
    Prisma->>DB: SELECT FROM preventivi WHERE id=...
    DB-->>Prisma: Preventivo data
    
    alt Preventivo non trovato
        PreventivoService-->>API: Error 404
    else Preventivo trovato
        PreventivoService->>CodiceService: validateCodice(codiceId, preventivo, userId)
        
        CodiceService->>Prisma: Fetch codice
        Prisma->>DB: SELECT FROM codici_sconto
        DB-->>Prisma: Codice data
        
        CodiceService->>CodiceService: Valida regole
        
        alt Codice scaduto
            CodiceService-->>PreventivoService: Error "Scaduto"
        else Codice esaurito
            CodiceService-->>PreventivoService: Error "Esaurito"
        else Importo < minImporto
            CodiceService-->>PreventivoService: Error "Min non raggiunto"
        else Non cumulabile + già sconti
            CodiceService-->>PreventivoService: Error "Non cumulabile"
        else Validazione OK
            CodiceService-->>PreventivoService: ✅ Codice valido
            
            PreventivoService->>PreventivoService: Calcola sconto
            Note over PreventivoService: importoScontato = calcolo con cap
            
            PreventivoService->>Prisma: Transaction START
            
            Prisma->>DB: INSERT preventivo_sconto (snapshot)
            Prisma->>DB: UPDATE codici_sconto SET utilizzoCorrente++
            Prisma->>DB: UPDATE preventivi (ricalcolo totali)
            
            Prisma->>DB: COMMIT
            
            PreventivoService-->>API: Success + Preventivo aggiornato
            API-->>Frontend: 201 Created
            Frontend-->>User: "Sconto applicato: -€X"
        end
    end
```

**Validazioni Codice**:
```javascript
function validateCodice(codice, preventivo, userId) {
  // 1. Attivo
  if (!codice.attivo) throw new Error('Codice disabilitato');
  
  // 2. Validità temporale
  const now = new Date();
  if (now < codice.dataInizio || now > codice.dataFine) 
    throw new Error('Codice scaduto');
  
  // 3. Utilizzo massimo
  if (codice.utilizzoMassimo && 
      codice.utilizzoCorrente >= codice.utilizzoMassimo)
    throw new Error('Codice esaurito');
  
  // 4. Utilizzo per utente
  if (codice.utilizzoPerUtente) {
    const count = await countUtilizziByUser(codice.id, userId);
    if (count >= codice.utilizzoPerUtente)
      throw new Error('Limite utilizzi per utente raggiunto');
  }
  
  // 5. Importo minimo
  if (codice.minImporto && preventivo.subtotale < codice.minImporto)
    throw new Error(`Importo minimo: €${codice.minImporto}`);
  
  // 6. Cumulabilità
  if (!codice.cumulabile && preventivo.sconti.length > 0)
    throw new Error('Codice non cumulabile');
  
  // 7. Applicabilità azienda/persona
  if (codice.applicabileA === 'AZIENDE_SPECIFICHE') {
    const allowed = codice.aziende.some(a => a.aziendaId === preventivo.aziendaId);
    if (!allowed) throw new Error('Codice non valido per questa azienda');
  }
  
  // 8. Applicabilità servizi
  if (!codice.applicabileServizi.includes(preventivo.tipoServizio))
    throw new Error('Codice non valido per questo tipo servizio');
  
  return true;
}
```

**Calcolo Sconto**:
```javascript
function calcolaSconto(codice, preventivo) {
  let importoScontato = 0;
  
  if (codice.tipoSconto === 'PERCENTUALE') {
    importoScontato = preventivo.subtotale * (codice.valore / 100);
    
    // Applica cap se definito
    if (codice.maxImporto && importoScontato > codice.maxImporto) {
      importoScontato = codice.maxImporto;
    }
  } else {
    // VALORE_ASSOLUTO
    importoScontato = codice.valore;
  }
  
  // Round a 2 decimali
  return Math.round(importoScontato * 100) / 100;
}
```

**Ricalcolo Preventivo**:
```javascript
function ricalcolaTotali(preventivo) {
  // 1. Subtotale
  const subtotale = preventivo.prezzoTotale + preventivo.speseAccessorie;
  
  // 2. Sconto totale (somma tutti gli sconti)
  const scontoTotale = preventivo.sconti.reduce(
    (sum, s) => sum + s.importoScontato, 
    0
  );
  
  // 3. Imponibile
  const imponibile = subtotale - scontoTotale;
  
  // 4. IVA
  const importoIva = imponibile * (preventivo.aliquotaIva / 100);
  
  // 5. Totale finale
  const importoFinale = imponibile + importoIva;
  
  return {
    subtotale,
    scontoTotale,
    imponibile,
    importoIva,
    importoFinale
  };
}
```

---

### 3. Generazione PDF Preventivo

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API
    participant PreventivoService
    participant TemplateService
    participant MarkerResolver
    participant PDFGenerator
    participant Storage
    participant DB

    User->>Frontend: Click "Genera PDF"
    Frontend->>API: GET /preventivi/:id/pdf
    API->>PreventivoService: generatePDF(preventivoId)
    
    PreventivoService->>DB: Fetch preventivo (con includes)
    Note over DB: Include: azienda, persona, corso, sconti
    DB-->>PreventivoService: Preventivo completo
    
    PreventivoService->>TemplateService: getTemplate('preventivo')
    TemplateService->>DB: SELECT FROM templates WHERE type='preventivo'
    DB-->>TemplateService: HTML template
    
    PreventivoService->>MarkerResolver: resolve(template, preventivoData)
    
    loop Per ogni marker
        MarkerResolver->>MarkerResolver: Replace {{marker}} con valore
        Note over MarkerResolver: Es: {{azienda.ragioneSociale}} → "Acme Corp"
        MarkerResolver->>MarkerResolver: Apply formatters
        Note over MarkerResolver: {{importoFinale|currency}} → "€1,647.00"
        MarkerResolver->>MarkerResolver: XSS sanitization
    end
    
    MarkerResolver-->>PreventivoService: HTML compilato
    
    PreventivoService->>PDFGenerator: htmlToPDF(html, options)
    PDFGenerator->>PDFGenerator: Launch Puppeteer
    PDFGenerator->>PDFGenerator: Render HTML
    PDFGenerator->>PDFGenerator: Export to PDF buffer
    PDFGenerator-->>PreventivoService: PDF Buffer
    
    PreventivoService->>Storage: Save PDF
    Storage->>DB: INSERT file metadata
    
    alt Primo PDF generato
        PreventivoService->>DB: UPDATE preventivi SET stato='INVIATO'
    end
    
    PreventivoService-->>API: PDF Buffer + filename
    API-->>Frontend: application/pdf (stream)
    Frontend-->>User: Browser download "preventivo-PREV-2025-0042.pdf"
```

**Template Markers**:

```html
<!-- Esempio template HTML -->
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Styling per PDF */
  </style>
</head>
<body>
  <header>
    <img src="{{logoUrl}}" alt="Logo">
    <h1>Preventivo {{numero}}</h1>
  </header>
  
  <section class="cliente">
    <h2>Cliente</h2>
    {{#if azienda}}
      <p><strong>{{azienda.ragioneSociale}}</strong></p>
      <p>P.IVA: {{azienda.piva}}</p>
      <p>{{azienda.indirizzo}}</p>
      <p>Email: {{azienda.mail}}</p>
    {{else}}
      <p><strong>{{persona.firstName}} {{persona.lastName}}</strong></p>
      <p>CF: {{persona.codiceFiscale}}</p>
      <p>Email: {{persona.email}}</p>
    {{/if}}
  </section>
  
  <section class="servizio">
    <h2>{{titoloServizio}}</h2>
    <p>{{descrizioneServizio}}</p>
  </section>
  
  <table class="prezzi">
    <tr>
      <td>Prezzo Base</td>
      <td class="amount">{{prezzoTotale|currency}}</td>
    </tr>
    {{#if speseAccessorie}}
    <tr>
      <td>Spese Accessorie</td>
      <td class="amount">{{speseAccessorie|currency}}</td>
    </tr>
    {{/if}}
    <tr class="subtotal">
      <td>Subtotale</td>
      <td class="amount">{{subtotale|currency}}</td>
    </tr>
    
    {{#each sconti}}
    <tr class="discount">
      <td>Sconto {{codiceTesto}} ({{valoreSconto}}{{#if tipoSconto=='PERCENTUALE'}}%{{else}}€{{/if}})</td>
      <td class="amount">-{{importoScontato|currency}}</td>
    </tr>
    {{/each}}
    
    <tr class="taxable">
      <td>Imponibile</td>
      <td class="amount">{{imponibile|currency}}</td>
    </tr>
    <tr>
      <td>IVA ({{aliquotaIva}}%)</td>
      <td class="amount">{{importoIva|currency}}</td>
    </tr>
    <tr class="total">
      <td><strong>TOTALE</strong></td>
      <td class="amount"><strong>{{importoFinale|currency}}</strong></td>
    </tr>
  </table>
  
  <section class="validita">
    <p>Data Emissione: {{dataEmissione|date}}</p>
    <p>Valido fino al: {{dataValidita|date}}</p>
  </section>
  
  <footer>
    <p>{{note}}</p>
  </footer>
</body>
</html>
```

**Formatters**:

```javascript
const formatters = {
  currency: (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  },
  
  date: (value) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(value));
  },
  
  percentage: (value) => {
    return `${value}%`;
  },
  
  uppercase: (value) => value.toUpperCase(),
  lowercase: (value) => value.toLowerCase()
};
```

---

## 🔒 Security Architecture

### 1. Autenticazione (JWT)

```javascript
// JWT Payload
{
  sub: userId,           // Subject (user ID)
  tenantId: tenantId,    // Multi-tenancy
  email: email,
  roles: ['admin'],
  permissions: [
    'codici_sconto_create',
    'preventivi_read',
    // ...
  ],
  iat: 1699533600,       // Issued at
  exp: 1700138400        // Expires (7 giorni)
}
```

**Flow**:
```
Login → JWT generato → Stored in localStorage (frontend)
Request → Header: Authorization: Bearer <token>
Backend → Verifica firma + expiration → Estrae user + tenant
```

### 2. RBAC (Role-Based Access Control)

**Permission Matrix**:

| Permission | Admin | Manager | Commerciale | Segreteria |
|------------|-------|---------|-------------|------------|
| `codici_sconto_read` | ✅ | ✅ | ✅ | ✅ |
| `codici_sconto_create` | ✅ | ✅ | ❌ | ❌ |
| `codici_sconto_update` | ✅ | ✅ | ❌ | ❌ |
| `codici_sconto_delete` | ✅ | ❌ | ❌ | ❌ |
| `preventivi_read` | ✅ | ✅ | ✅ | ✅ |
| `preventivi_create` | ✅ | ✅ | ✅ | ✅ |
| `preventivi_update` | ✅ | ✅ | ✅ | ❌ |
| `preventivi_delete` | ✅ | ❌ | ❌ | ❌ |

**Middleware Implementation**:

```javascript
// middleware/rbac.js
function requirePermission(permission) {
  return async (req, res, next) => {
    const { user } = req;  // Da auth middleware
    
    // Fetch user permissions
    const userPermissions = await prisma.person.findUnique({
      where: { id: user.id },
      include: { 
        permissions: true,
        role: { include: { permissions: true } }
      }
    });
    
    // Combina role permissions + person permissions
    const allPermissions = [
      ...userPermissions.role.permissions.map(p => p.permission),
      ...userPermissions.permissions.map(p => p.permission)
    ];
    
    // Check permission
    if (!allPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Permesso insufficiente',
        required: permission
      });
    }
    
    next();
  };
}

// Uso nelle routes
router.post('/codici-sconto', 
  authMiddleware,
  requirePermission('codici_sconto_create'),
  createCodiceHandler
);
```

### 3. Multi-Tenancy Isolation

**Middleware**:

```javascript
// middleware/tenant-filter.js
function enforceTenantIsolation(req, res, next) {
  const { tenantId } = req.user;
  
  // Override Prisma client per questo request
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = args.where || {};
          args.where.tenantId = tenantId;
          args.where.deletedAt = null;  // Soft delete
          return query(args);
        },
        
        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && result.tenantId !== tenantId) {
            throw new Error('Access denied - tenant mismatch');
          }
          return result;
        },
        
        async create({ args, query }) {
          args.data.tenantId = tenantId;
          return query(args);
        },
        
        async update({ args, query }) {
          // Verifica che record appartenga al tenant
          const existing = await prisma[args.model].findUnique({
            where: args.where
          });
          if (existing.tenantId !== tenantId) {
            throw new Error('Access denied');
          }
          return query(args);
        }
      }
    }
  });
  
  next();
}
```

### 4. Input Validation

**Zod Schema Example**:

```typescript
import { z } from 'zod';

const createCodiceSchema = z.object({
  codice: z.string()
    .min(3, 'Minimo 3 caratteri')
    .max(50, 'Massimo 50 caratteri')
    .regex(/^[A-Z0-9_-]+$/i, 'Solo alfanumerici, - e _'),
  
  nome: z.string()
    .min(1, 'Obbligatorio')
    .max(200),
  
  descrizione: z.string()
    .max(2000)
    .optional(),
  
  tipoSconto: z.enum(['PERCENTUALE', 'VALORE_ASSOLUTO']),
  
  valore: z.number()
    .positive('Deve essere > 0')
    .refine((val, ctx) => {
      if (ctx.parent.tipoSconto === 'PERCENTUALE' && val > 100) {
        return false;
      }
      return true;
    }, 'Percentuale max 100'),
  
  dataInizio: z.coerce.date(),
  
  dataFine: z.coerce.date()
    .refine((val, ctx) => {
      return val > ctx.parent.dataInizio;
    }, 'Data fine deve essere > data inizio'),
  
  attivo: z.boolean().default(true),
  
  utilizzoMassimo: z.number()
    .int()
    .positive()
    .optional(),
  
  minImporto: z.number()
    .positive()
    .optional(),
  
  maxImporto: z.number()
    .positive()
    .optional()
    .refine((val, ctx) => {
      if (val && ctx.parent.minImporto && val <= ctx.parent.minImporto) {
        return false;
      }
      return true;
    }, 'Max importo deve essere > min importo'),
  
  cumulabile: z.boolean().default(false),
  
  applicabileA: z.enum([
    'TUTTI', 
    'AZIENDE_SPECIFICHE', 
    'PERSONE_SPECIFICHE', 
    'CORSI_SPECIFICI'
  ]).default('TUTTI'),
  
  applicabileServizi: z.array(z.enum([
    'CORSO', 'DVR', 'RSPP', 'MEDICO_COMPETENTE', 'PRIVACY', 'ALTRO'
  ])).default(['CORSO'])
});
```

### 5. XSS Prevention

**HTML Sanitization**:

```javascript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}

// In marker resolver
function resolveMarker(template, data) {
  return template.replace(/{{(\w+)}}/g, (match, key) => {
    const value = data[key];
    return sanitizeHTML(String(value));
  });
}
```

### 6. SQL Injection Prevention

**Prisma ORM** (parameterized queries automatiche):

```javascript
// ❌ VULNERABILE (raw SQL)
await prisma.$queryRaw`
  SELECT * FROM codici_sconto 
  WHERE codice = ${userInput}
`;

// ✅ SICURO (Prisma typed queries)
await prisma.codiciSconto.findUnique({
  where: { codice: userInput }  // Auto-escaped
});

// ✅ SICURO (parametri Prisma raw query)
await prisma.$queryRaw`
  SELECT * FROM codici_sconto 
  WHERE codice = ${Prisma.sql(userInput)}
`;
```

### 7. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minuto
  max: 100,                  // 100 requests
  message: 'Troppi tentativi, riprova tra 1 minuto',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

// PDF generation rate limit (più restrittivo)
const pdfLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Limite generazione PDF raggiunto'
});

app.use('/api', apiLimiter);
app.use('/api/preventivi/:id/pdf', pdfLimiter);
```

---

## 📝 GDPR Compliance

### 1. Audit Logging

**Ogni operazione viene loggata**:

```javascript
async function logAudit(action, tableName, recordId, changes, userId, tenantId, req) {
  await prisma.gdprAuditLog.create({
    data: {
      action,           // CREATE, READ, UPDATE, DELETE
      tableName,
      recordId,
      changes: changes, // JSON snapshot before/after
      performedBy: userId,
      performedAt: new Date(),
      tenantId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
}

// Esempio uso
await logAudit(
  'UPDATE',
  'codici_sconto',
  codiceId,
  {
    before: { attivo: true, valore: 20 },
    after: { attivo: false, valore: 15 }
  },
  req.user.id,
  req.user.tenantId,
  req
);
```

### 2. Soft Delete

**Implementazione**:

```javascript
// ❌ Hard delete (GDPR non compliant)
await prisma.codiciSconto.delete({
  where: { id: codiceId }
});

// ✅ Soft delete (GDPR compliant)
await prisma.codiciSconto.update({
  where: { id: codiceId },
  data: { 
    deletedAt: new Date(),
    deletedBy: userId  // Optional
  }
});

// Query escludi deleted
await prisma.codiciSconto.findMany({
  where: { 
    deletedAt: null,  // Filtra soft-deleted
    tenantId
  }
});
```

### 3. Data Minimization

**Principio**: Collezionare solo dati necessari

```javascript
// ✅ Codice Sconto: no dati personali sensibili
{
  codice: "PROMO20",           // OK
  nome: "Promozione Natale",   // OK
  valore: 20,                  // OK
  // NO: email cliente, telefono, etc.
}

// ✅ Preventivo: dati cliente via FK, non duplicati
{
  aziendaId: "uuid",  // Link, non copia
  // NO: ragioneSociale duplicata (usa relazione)
}

// ✅ PreventivoSconto: Snapshot necessario (eccezione giustificata)
{
  codiceTesto: "PROMO20",           // Snapshot
  nomeCodice: "Promozione Natale",  // Snapshot
  valoreSconto: 20,                 // Snapshot
  // Motivo: Codice può cambiare/eliminarsi dopo applicazione
}
```

### 4. Right to Access (Future)

**Endpoint per export dati utente**:

```javascript
// GET /api/gdpr/my-data
async function exportUserData(req, res) {
  const { userId } = req.user;
  
  const data = {
    user: await prisma.person.findUnique({ where: { id: userId } }),
    
    codiceScontoCreati: await prisma.codiciSconto.findMany({
      where: { createdBy: userId, deletedAt: null }
    }),
    
    preventivi: await prisma.preventivi.findMany({
      where: { 
        OR: [
          { personaId: userId },
          { createdBy: userId }
        ],
        deletedAt: null
      },
      include: { sconti: true }
    }),
    
    auditLogs: await prisma.gdprAuditLog.findMany({
      where: { performedBy: userId }
    })
  };
  
  res.json({
    success: true,
    data,
    exportedAt: new Date()
  });
}
```

### 5. Right to Erasure (Future)

**Anonimizzazione**:

```javascript
// GDPR: Right to be forgotten
async function anonymizeUser(userId) {
  await prisma.$transaction(async (tx) => {
    // Anonimizza utente
    await tx.person.update({
      where: { id: userId },
      data: {
        firstName: 'ANONIMIZZATO',
        lastName: 'ANONIMIZZATO',
        email: `deleted-${userId}@anonymized.local`,
        phone: null,
        // ...altri campi sensibili
        deletedAt: new Date()
      }
    });
    
    // Mantieni record per storico (GDPR permette)
    // Ma anonimizza riferimenti personali
    await tx.preventivi.updateMany({
      where: { personaId: userId },
      data: {
        // Mantieni preventivo ma rimuovi link
        personaId: null,
        metaPreventivo: {
          ...metaPreventivo,
          _anonymized: true,
          _originalUserId: userId  // Solo per tracciabilità interna
        }
      }
    });
    
    // Log anonimizzazione
    await tx.gdprAuditLog.create({
      data: {
        action: 'ANONYMIZE',
        tableName: 'persons',
        recordId: userId,
        performedAt: new Date(),
        changes: { reason: 'GDPR Right to Erasure' }
      }
    });
  });
}
```

---

## 🧪 Testing Strategy

### Livelli di Testing

```
┌─────────────────────────────────────┐
│   E2E Tests (Playwright)            │  ← User workflows completi
│   - Crea codice → Applica → PDF    │
├─────────────────────────────────────┤
│   Integration Tests (Jest+Supertest)│  ← API endpoints
│   - Routes + Controllers + DB       │
├─────────────────────────────────────┤
│   Unit Tests (Jest)                 │  ← Business logic
│   - Services + Utils                │
├─────────────────────────────────────┤
│   Static Analysis                   │
│   - TypeScript + ESLint             │
└─────────────────────────────────────┘
```

### Unit Test Example

```javascript
// codici-sconto-service.test.js
describe('CodiciScontoService', () => {
  describe('validateCodice', () => {
    it('should reject expired codice', async () => {
      const codice = {
        attivo: true,
        dataInizio: new Date('2023-01-01'),
        dataFine: new Date('2023-12-31'),  // Passata
        utilizzoCorrente: 0,
        utilizzoMassimo: 100
      };
      
      await expect(
        service.validateCodice(codice, preventivo, userId)
      ).rejects.toThrow('Codice scaduto');
    });
    
    it('should reject if utilizzo massimo reached', async () => {
      const codice = {
        attivo: true,
        dataInizio: new Date('2025-01-01'),
        dataFine: new Date('2025-12-31'),
        utilizzoCorrente: 100,
        utilizzoMassimo: 100  // Esaurito
      };
      
      await expect(
        service.validateCodice(codice, preventivo, userId)
      ).rejects.toThrow('Codice esaurito');
    });
    
    it('should validate successfully when all checks pass', async () => {
      const codice = createValidCodice();
      const preventivo = createValidPreventivo();
      
      const result = await service.validateCodice(codice, preventivo, userId);
      
      expect(result).toBe(true);
    });
  });
  
  describe('calcolaSconto', () => {
    it('should calculate percentage correctly', () => {
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 20,
        maxImporto: null
      };
      const preventivo = { subtotale: 1000 };
      
      const sconto = service.calcolaSconto(codice, preventivo);
      
      expect(sconto).toBe(200);  // 20% di 1000
    });
    
    it('should apply cap when maxImporto set', () => {
      const codice = {
        tipoSconto: 'PERCENTUALE',
        valore: 20,
        maxImporto: 150
      };
      const preventivo = { subtotale: 1000 };
      
      const sconto = service.calcolaSconto(codice, preventivo);
      
      expect(sconto).toBe(150);  // Capped a 150
    });
  });
});
```

### Integration Test Example

```javascript
// codici-sconto.integration.test.js
describe('POST /api/codici-sconto', () => {
  let authToken;
  
  beforeAll(async () => {
    authToken = await getAuthToken('admin@test.com');
  });
  
  afterEach(async () => {
    await cleanupTestData();
  });
  
  it('should create codice sconto successfully', async () => {
    const payload = {
      codice: 'TEST20',
      nome: 'Test Sconto',
      tipoSconto: 'PERCENTUALE',
      valore: 20,
      dataInizio: '2025-01-01T00:00:00Z',
      dataFine: '2025-12-31T23:59:59Z',
      attivo: true,
      applicabileA: 'TUTTI',
      cumulabile: false,
      createdBy: testUserId
    };
    
    const response = await request(app)
      .post('/api/codici-sconto')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      codice: 'TEST20',
      nome: 'Test Sconto',
      tipoSconto: 'PERCENTUALE',
      valore: 20
    });
    
    // Verifica in DB
    const codice = await prisma.codiciSconto.findUnique({
      where: { id: response.body.data.id }
    });
    expect(codice).toBeTruthy();
  });
  
  it('should return 409 if codice duplicated', async () => {
    // Crea primo codice
    await createTestCodice({ codice: 'DUPLICATE' });
    
    // Tenta duplicato
    const response = await request(app)
      .post('/api/codici-sconto')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ codice: 'DUPLICATE', /* ... */ })
      .expect(409);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('già esistente');
  });
});
```

---

## 📈 Performance Considerations

### Database Indexes

```sql
-- Già esistenti (da migrations)
CREATE INDEX idx_codici_sconto_codice ON codici_sconto(codice) WHERE deletedAt IS NULL;
CREATE INDEX idx_codici_sconto_tenant ON codici_sconto(tenantId, deletedAt);
CREATE INDEX idx_codici_sconto_attivo ON codici_sconto(attivo, dataFine) WHERE deletedAt IS NULL;

CREATE INDEX idx_preventivi_numero ON preventivi(numero) WHERE deletedAt IS NULL;
CREATE INDEX idx_preventivi_tenant ON preventivi(tenantId, deletedAt);
CREATE INDEX idx_preventivi_stato ON preventivi(stato, dataEmissione DESC);
CREATE INDEX idx_preventivi_cliente ON preventivi(aziendaId, personaId);

-- Indici aggiuntivi per query comuni
CREATE INDEX idx_preventivo_sconto_preventivoId ON preventivo_sconto(preventivoId);
CREATE INDEX idx_preventivo_sconto_codiceId ON preventivo_sconto(codiceId);

CREATE INDEX idx_audit_log_tenant ON gdpr_audit_log(tenantId, performedAt DESC);
CREATE INDEX idx_audit_log_table ON gdpr_audit_log(tableName, recordId);
```

### Query Optimization

**Eager Loading** (evita N+1):

```javascript
// ❌ N+1 Problem
const preventivi = await prisma.preventivi.findMany();
for (const p of preventivi) {
  const azienda = await prisma.azienda.findUnique({ 
    where: { id: p.aziendaId } 
  });  // N query extra!
}

// ✅ Include (JOIN)
const preventivi = await prisma.preventivi.findMany({
  include: {
    azienda: true,
    persona: true,
    sconti: {
      include: { codice: true }
    }
  }
});
```

**Pagination**:

```javascript
// Lista con paginazione
async function listPreventivi(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  const [data, total] = await Promise.all([
    prisma.preventivi.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { dataEmissione: 'desc' },
      include: { azienda: true, persona: true }
    }),
    
    prisma.preventivi.count({ where: filters })
  ]);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}
```

### Caching Strategy

```javascript
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300 });  // 5 minuti

async function getCodiciScontoAttivi(tenantId) {
  const cacheKey = `codici:attivi:${tenantId}`;
  
  // Check cache
  let codici = cache.get(cacheKey);
  if (codici) return codici;
  
  // Query DB
  codici = await prisma.codiciSconto.findMany({
    where: {
      tenantId,
      attivo: true,
      dataFine: { gte: new Date() },
      deletedAt: null
    }
  });
  
  // Store in cache
  cache.set(cacheKey, codici);
  
  return codici;
}

// Invalidate cache on update
async function updateCodice(id, data, tenantId) {
  const codice = await prisma.codiciSconto.update({
    where: { id },
    data
  });
  
  // Invalida cache
  cache.del(`codici:attivi:${tenantId}`);
  
  return codice;
}
```

---

## 🚀 Scalability

### Horizontal Scaling

**Stateless Architecture**:
- Nessuna session in-memory
- JWT per auth (no server-side sessions)
- File uploads su storage condiviso (S3/NFS)
- PM2 cluster mode: 2-4 istanze per server

**Load Balancing** (Nginx):

```nginx
upstream api_cluster {
    least_conn;  # Load balancing algorithm
    
    server 127.0.0.1:4001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4002 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:4003 weight=1 max_fails=3 fail_timeout=30s;
    
    keepalive 64;
}

server {
    location /api/ {
        proxy_pass http://api_cluster;
        # ...
    }
}
```

### Database Scaling

**Read Replicas** (futuro):

```javascript
// Prisma support per read replicas
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,  // Master (write)
      replicaUrl: process.env.DATABASE_REPLICA_URL  // Read replica
    }
  }
});

// Uso
await prisma.codiciSconto.findMany();  // → Read replica
await prisma.codiciSconto.create();    // → Master
```

### Connection Pooling

```env
# DATABASE_URL query params
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

**Prisma Connection Pool**:
- Default: 10 connections per istanza
- Con 4 istanze PM2: 40 connections totali
- PostgreSQL max_connections: 100+ raccomandato

---

## 📊 Monitoring & Observability

### Health Check Endpoint

```javascript
// GET /health
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  };
  
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.database = 'error';
    health.status = 'degraded';
  }
  
  res.status(health.status === 'ok' ? 200 : 503).json(health);
});
```

### Metrics da Tracciare

**Application Metrics**:
- Request rate (req/min)
- Response time (avg, p50, p95, p99)
- Error rate (% 4xx, % 5xx)
- Active connections

**Business Metrics**:
- Codici sconto creati/giorno
- Preventivi generati/giorno
- PDF generati/ora
- Tasso conversione preventivi (accettati/inviati)
- Totale € scontato/mese

**System Metrics**:
- CPU usage
- Memory usage
- Disk I/O
- Database query time
- Cache hit ratio

### Logging

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: req.ip
    });
  });
  
  next();
});
```

---

## 🔄 CI/CD Pipeline (Consigliato)

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [production]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Run linter
        run: npm run lint
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/elementmedica
            git pull origin production
            cd backend && npm ci --production
            npx prisma migrate deploy
            cd .. && npm ci --production && npm run build
            pm2 reload elementmedica-api
```

---

## 📚 Risorse e Riferimenti

### Documentazione Interna
- [API Reference](./api/README.md)
- [User Guide - Codici Sconto](../user/CODICI_SCONTO_GUIDE.md)
- [User Guide - Preventivi](../user/PREVENTIVI_GUIDE.md)
- [Deployment Guide](../deployment/PREVENTIVI_DEPLOYMENT.md)
- [Testing Report FASE 6](../testing/FASE_6_TESTING_REPORT.md)

### Tecnologie
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [PostgreSQL](https://www.postgresql.org/docs/)

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Guidelines](https://gdpr.eu/)
- [REST API Design](https://restfulapi.net/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Versione**: 1.0.0  
**Ultimo Aggiornamento**: 9 Novembre 2025  
**Autori**: ElementMedica Architecture Team  
**Stato**: ✅ Validato e Approvato
