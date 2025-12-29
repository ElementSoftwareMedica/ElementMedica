# 🏗️ ARCHITETTURA TECNICA - Poliambulatorio ElementMedica

**Versione**: 2.0  
**Data**: 2025-12-11  
**Documento**: 06_ARCHITETTURA_TECNICA.md

---

## 1. OVERVIEW ARCHITETTURALE

### 1.1 Diagramma Sistema Completo

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           POLIAMBULATORIO ELEMENTMEDICA                          │
│                              System Architecture                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │         INTERNET               │
                        └───────────────┬─────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
    ┌─────────┴─────────┐     ┌────────┴────────┐     ┌─────────┴─────────┐
    │ elementmedica.com │     │  app.element    │     │    Mobile App     │
    │   (Public Site)   │     │   medica.com    │     │   (Future PWA)    │
    │    Landing +      │     │  (Private App)  │     │                   │
    │  Booking Public   │     │   Staff Portal  │     │                   │
    └─────────┬─────────┘     └────────┬────────┘     └─────────┬─────────┘
              │                         │                         │
              └─────────────────────────┼─────────────────────────┘
                                        │
                            ┌───────────┴───────────┐
                            │      CLOUDFLARE       │
                            │    CDN + WAF + DDoS   │
                            └───────────┬───────────┘
                                        │
                            ┌───────────┴───────────┐
                            │    NGINX REVERSE      │
                            │       PROXY           │
                            │   (SSL Termination)   │
                            └───────────┬───────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
    ┌─────────┴─────────┐     ┌────────┴────────┐     ┌─────────┴─────────┐
    │  PROXY SERVER     │     │   API SERVER    │     │  DOCUMENTS        │
    │     :4003         │     │     :4001       │     │    SERVER         │
    │  Rate Limiting    │     │  Express.js     │     │     :4002         │
    │  CORS Handler     │     │  Prisma ORM     │     │  PDF Generation   │
    │  Domain Routing   │     │  Auth/RBAC      │     │  Puppeteer Pool   │
    └─────────┬─────────┘     └────────┬────────┘     └─────────┬─────────┘
              │                         │                         │
              └─────────────────────────┼─────────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
    ┌─────────┴─────────┐     ┌────────┴────────┐     ┌─────────┴─────────┐
    │   POSTGRESQL      │     │      REDIS      │     │    S3 / MINIO     │
    │    Database       │     │  Cache + Queue  │     │   Object Store    │
    │  Multi-tenant     │     │    Sessions     │     │   Documents       │
    │  Encrypted PHI    │     │    BullMQ       │     │   Encrypted       │
    └───────────────────┘     └─────────────────┘     └───────────────────┘
```

---

## 2. STACK TECNOLOGICO

### 2.1 Frontend

| Layer | Tecnologia | Versione | Note |
|-------|------------|----------|------|
| Framework | React | 18.x | Hooks, Concurrent |
| Build Tool | Vite | 5.x | Multi-entry config |
| Language | TypeScript | 5.x | Strict mode |
| Styling | TailwindCSS | 3.x | + shadcn/ui |
| State | React Query | 5.x | Server state |
| Forms | React Hook Form | 7.x | + Zod validation |
| Router | React Router | 6.x | Nested routes |
| Charts | Recharts | 2.x | Dashboard |
| Calendar | FullCalendar | 6.x | Agenda |
| Rich Text | TipTap | 2.x | Referti editor |
| PDF | react-pdf | 7.x | Preview |

### 2.2 Backend

| Layer | Tecnologia | Versione | Note |
|-------|------------|----------|------|
| Runtime | Node.js | 20.x LTS | ESM modules |
| Framework | Express.js | 4.x | Modular routes |
| ORM | Prisma | 5.x | PostgreSQL |
| Validation | Joi | 17.x | Schema validation |
| Auth | jsonwebtoken | 9.x | JWT + refresh |
| MFA | speakeasy | 2.x | TOTP |
| Queue | BullMQ | 5.x | Redis-backed |
| Email | Nodemailer | 6.x | + templates |
| SMS | Twilio SDK | 4.x | Notifications |
| PDF | Puppeteer | 22.x | Generation |
| Storage | AWS SDK | 3.x | S3 compatible |
| Crypto | crypto | native | PHI encryption |

### 2.3 Database

| Component | Tecnologia | Note |
|-----------|------------|------|
| RDBMS | PostgreSQL | 15.x |
| Full-text | PG FTS | tsvector |
| Encryption | pgcrypto | PHI fields |
| Connection Pool | pgBouncer | Production |

### 2.4 Infrastructure

| Component | Tecnologia | Note |
|-----------|------------|------|
| Container | Docker | Compose for dev |
| Reverse Proxy | Nginx | SSL termination |
| Cache | Redis | 7.x |
| Object Storage | MinIO / S3 | Documents |
| Monitoring | Prometheus | + Grafana |
| Logging | Pino | + ELK stack |
| CI/CD | GitHub Actions | Automated |

---

## 3. ARCHITETTURA DATABASE

### 3.1 Schema Logico Semplificato

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                      │
│  │   Tenant    │──────│   Person    │──────│  PersonRole │                      │
│  │  (Multi-T)  │      │ (Unified)   │      │   (RBAC)    │                      │
│  └──────┬──────┘      └──────┬──────┘      └─────────────┘                      │
│         │                    │                                                   │
│         │    STRUTTURA       │                                                   │
│  ┌──────┴──────┐      ┌──────┴──────┐      ┌─────────────┐                      │
│  │Poliamb.    │──────│ Ambulatorio │──────│  Strumento  │                      │
│  │ + Sede     │      │  + Orario   │      │+ Manutenz.  │                      │
│  └─────────────┘      └──────┬──────┘      └─────────────┘                      │
│                              │                                                   │
│         CATALOGO             │          PRICING                                  │
│  ┌─────────────┐      ┌──────┴──────┐      ┌─────────────┐                      │
│  │ Prestazione │──────│   Listino   │──────│ Convenzione │                      │
│  │+ Template   │      │  + Prezzo   │      │  + Sconto   │                      │
│  └──────┬──────┘      └─────────────┘      └─────────────┘                      │
│         │                                                                        │
│         │         AGENDA                                                         │
│  ┌──────┴──────┐      ┌─────────────┐      ┌─────────────┐                      │
│  │Disponibilità│──────│Appuntamento │──────│NumeroChiam. │                      │
│  │  Medico     │      │  + Stati    │      │   (Coda)    │                      │
│  └─────────────┘      └──────┬──────┘      └─────────────┘                      │
│                              │                                                   │
│         CLINICA              │                                                   │
│  ┌─────────────┐      ┌──────┴──────┐      ┌─────────────┐                      │
│  │   Visita    │──────│   Referto   │──────│   Firma     │                      │
│  │ + Campi     │      │ + Versioni  │      │  Digitale   │                      │
│  └─────────────┘      └─────────────┘      └─────────────┘                      │
│                                                                                  │
│         AUDIT                                                                    │
│  ┌─────────────┐      ┌─────────────┐                                           │
│  │ AuditLog    │      │ GDPR Audit  │                                           │
│  │  Clinico    │      │   + PHI     │                                           │
│  └─────────────┘      └─────────────┘                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Indici Ottimizzati

```sql
-- Indici compound per multi-tenancy
CREATE INDEX idx_appuntamenti_tenant_data ON appuntamenti(tenant_id, data_ora) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_visite_tenant_paziente ON visite(tenant_id, paziente_id, data_ora) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_referti_tenant_stato ON referti(tenant_id, stato, created_at) 
  WHERE deleted_at IS NULL;

-- Indici per ricerca full-text
CREATE INDEX idx_referti_fts ON referti 
  USING gin(to_tsvector('italian', contenuto));

CREATE INDEX idx_persons_search ON persons 
  USING gin(to_tsvector('italian', nome || ' ' || cognome || ' ' || COALESCE(email, '')));

-- Indici per performance agenda
CREATE INDEX idx_disponibilita_medico_giorno ON disponibilita_medico(medico_id, giorno_settimana) 
  WHERE is_attivo = true;

CREATE INDEX idx_appuntamenti_slot ON appuntamenti(ambulatorio_id, data_ora, durata_prevista) 
  WHERE stato NOT IN ('ANNULLATO', 'NO_SHOW');
```

### 3.3 Encryption at Rest (PHI)

```javascript
// Campi cifrati in database
const PHI_ENCRYPTED_FIELDS = [
  'Person.codiceFiscale',
  'Person.numeroTesseraSanitaria',
  'Visita.noteClinic',           // Note sensibili
  'Visita.diagnosi',             // Diagnosi
  'Referto.contenuto',           // Contenuto referto
  'AllegatoVisita.storageKey',   // Path file
];

// Encryption service
class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  
  encrypt(plaintext: string, keyId: string): EncryptedData {
    const key = this.getKey(keyId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      keyId
    };
  }
}
```

---

## 4. ARCHITETTURA API

### 4.1 Struttura Routes

```
/api/v1/
├── auth/
│   ├── login
│   ├── logout
│   ├── refresh
│   ├── mfa/setup
│   └── mfa/verify
│
├── clinica/
│   ├── poliambulatori/
│   │   ├── GET    /              # Lista
│   │   ├── POST   /              # Crea
│   │   ├── GET    /:id           # Dettaglio
│   │   ├── PUT    /:id           # Modifica
│   │   └── DELETE /:id           # Soft delete
│   │
│   ├── ambulatori/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── DELETE /:id
│   │   └── GET    /:id/orari
│   │
│   ├── prestazioni/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── DELETE /:id
│   │   ├── GET    /:id/template-campi
│   │   ├── POST   /:id/template-campi
│   │   └── PUT    /:id/template-campi/ordina
│   │
│   ├── strumenti/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── DELETE /:id
│   │   ├── GET    /:id/manutenzioni
│   │   ├── POST   /:id/manutenzioni
│   │   └── GET    /:id/roi
│   │
│   ├── agenda/
│   │   ├── GET    /disponibilita
│   │   ├── POST   /disponibilita
│   │   ├── GET    /slot-liberi
│   │   ├── GET    /calendario
│   │   └── POST   /ferie-assenze
│   │
│   ├── appuntamenti/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── DELETE /:id
│   │   ├── POST   /:id/conferma
│   │   ├── POST   /:id/accetta
│   │   ├── POST   /:id/chiama
│   │   ├── POST   /:id/inizia-visita
│   │   └── POST   /:id/annulla
│   │
│   ├── visite/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── POST   /:id/inizia
│   │   ├── PUT    /:id/campi
│   │   ├── POST   /:id/autosave
│   │   ├── POST   /:id/completa
│   │   ├── GET    /:id/allegati
│   │   └── POST   /:id/allegati
│   │
│   ├── referti/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── GET    /:id/versioni
│   │   ├── GET    /:id/diff/:v1/:v2
│   │   ├── POST   /:id/firma
│   │   ├── GET    /:id/pdf/preview
│   │   ├── GET    /:id/pdf
│   │   └── POST   /:id/invia
│   │
│   ├── listini/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   ├── GET    /:id/prezzi
│   │   └── POST   /calcola-prezzo
│   │
│   ├── convenzioni/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── PUT    /:id
│   │   └── GET    /:id/utilizzo
│   │
│   ├── chiamate/
│   │   ├── GET    /oggi
│   │   ├── POST   /:id/chiama
│   │   └── GET    /monitor        # WebSocket
│   │
│   ├── fatture/
│   │   ├── GET    /
│   │   ├── POST   /
│   │   ├── GET    /:id
│   │   ├── POST   /:id/emetti
│   │   ├── POST   /:id/pagamento
│   │   └── GET    /:id/pdf
│   │
│   ├── audit/
│   │   ├── GET    /logs
│   │   └── GET    /export
│   │
│   └── search/
│       ├── GET    /pazienti
│       └── GET    /referti
│
└── public/
    ├── GET    /disponibilita       # Booking pubblico
    └── POST   /prenota             # Prenotazione online
```

### 4.2 Middleware Stack

```javascript
// Ordine middleware per routes cliniche
const clinicaMiddleware = [
  cors(corsOptions),           // 1. CORS
  rateLimiter(clinicalLimits), // 2. Rate limiting
  helmet(),                    // 3. Security headers
  authenticate,                // 4. JWT verification
  tenantContext,               // 5. Tenant isolation
  requireAppType('MEDICA'),    // 6. App type check
  auditLogger,                 // 7. Audit trail
  validateRequest,             // 8. Joi validation
];
```

### 4.3 Error Handling

```typescript
// Error response standard
interface ApiError {
  success: false;
  error: {
    code: string;        // 'VALIDATION_ERROR', 'NOT_FOUND', etc.
    message: string;     // User-friendly message
    details?: any;       // Validation errors, etc.
    requestId: string;   // For debugging
  };
  timestamp: string;
}

// Error codes clinici
const CLINICAL_ERRORS = {
  SLOT_NOT_AVAILABLE: 'Slot non più disponibile',
  PATIENT_BLOCKED: 'Paziente con appuntamenti sospesi',
  INVALID_CONSENT: 'Consenso mancante o scaduto',
  REPORT_ALREADY_SIGNED: 'Referto già firmato, non modificabile',
  VISIT_NOT_COMPLETABLE: 'Campi obbligatori mancanti',
  EQUIPMENT_UNAVAILABLE: 'Strumento non disponibile',
};
```

---

## 5. ARCHITETTURA FRONTEND

### 5.1 Struttura Directory

```
src/
├── main.medica.tsx              # Entry point medica
├── App.medica.tsx               # Router medica
│
├── features/                     # Feature-based organization
│   ├── auth-medica/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   │
│   ├── struttura/
│   │   ├── poliambulatori/
│   │   ├── ambulatori/
│   │   └── strumenti/
│   │
│   ├── catalogo/
│   │   ├── prestazioni/
│   │   ├── listini/
│   │   └── convenzioni/
│   │
│   ├── agenda/
│   │   ├── calendario/
│   │   ├── disponibilita/
│   │   └── booking/
│   │
│   ├── appuntamenti/
│   │   ├── lista/
│   │   ├── accettazione/
│   │   └── chiamate/
│   │
│   ├── visite/
│   │   ├── form-builder/
│   │   ├── esecuzione/
│   │   └── storico/
│   │
│   ├── referti/
│   │   ├── editor/
│   │   ├── firma/
│   │   └── versioni/
│   │
│   └── fatturazione/
│       ├── fatture/
│       └── pagamenti/
│
├── shared/                       # Shared across features
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   └── clinical/             # Clinical-specific
│   │       ├── PatientCard.tsx
│   │       ├── AppointmentCard.tsx
│   │       ├── StatusBadge.tsx
│   │       └── ClinicalTimeline.tsx
│   │
│   ├── hooks/
│   │   ├── useTenant.ts
│   │   ├── usePermissions.ts
│   │   └── useAudit.ts
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── clinicaApi.ts
│   │   └── websocket.ts
│   │
│   └── utils/
│       ├── dates.ts
│       ├── formatters.ts
│       └── validators.ts
│
└── layouts/
    └── MedicaLayout.tsx
```

### 5.2 State Management

```typescript
// React Query per server state
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minuti
      cacheTime: 10 * 60 * 1000,   // 10 minuti
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// Query keys organizzate
const queryKeys = {
  appuntamenti: {
    all: ['appuntamenti'] as const,
    lists: () => [...queryKeys.appuntamenti.all, 'list'] as const,
    list: (filters: AppuntamentoFilters) => 
      [...queryKeys.appuntamenti.lists(), filters] as const,
    details: () => [...queryKeys.appuntamenti.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.appuntamenti.details(), id] as const,
  },
  // ... altre entità
};
```

### 5.3 Routing Protetto

```typescript
// Route guards per permessi
const ProtectedRoute = ({ 
  children, 
  permission,
  roles,
}: ProtectedRouteProps) => {
  const { user, hasPermission, hasRole } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  
  if (permission && !hasPermission(permission)) {
    return <AccessDenied />;
  }
  
  if (roles && !roles.some(r => hasRole(r))) {
    return <AccessDenied />;
  }
  
  return children;
};

// Uso
<Route 
  path="/referti/:id/firma" 
  element={
    <ProtectedRoute permission="reports:sign">
      <FirmaRefertoPage />
    </ProtectedRoute>
  } 
/>
```

---

## 6. ARCHITETTURA REAL-TIME

### 6.1 WebSocket per Chiamate

```typescript
// Server
const io = new Server(server, {
  cors: corsOptions,
  path: '/ws/clinica'
});

io.on('connection', (socket) => {
  const { tenantId, ambulatorioId } = socket.handshake.query;
  
  // Join room per ambulatorio
  socket.join(`ambulatorio:${ambulatorioId}`);
  
  // Broadcast chiamata
  socket.on('chiama-paziente', async (data) => {
    const chiamata = await createChiamata(data);
    io.to(`ambulatorio:${ambulatorioId}`).emit('numero-chiamato', chiamata);
  });
});

// Client (Monitor)
const socket = io('/ws/clinica', {
  query: { tenantId, ambulatorioId }
});

socket.on('numero-chiamato', (chiamata) => {
  // Update display + audio
  setCurrentNumber(chiamata.numero);
  playAudioNotification();
});
```

---

## 7. JOB QUEUE ARCHITECTURE

### 7.1 BullMQ Workers

```typescript
// Definizione code
const queues = {
  pdfGeneration: new Queue('pdf-generation', { connection: redis }),
  emailNotifications: new Queue('email-notifications', { connection: redis }),
  smsReminders: new Queue('sms-reminders', { connection: redis }),
  reportScheduled: new Queue('report-scheduled', { connection: redis }),
};

// Worker PDF
const pdfWorker = new Worker('pdf-generation', async (job) => {
  const { type, entityId, options } = job.data;
  
  switch (type) {
    case 'referto':
      return await generateRefertoPDF(entityId, options);
    case 'fattura':
      return await generateFatturaPDF(entityId, options);
    default:
      throw new Error(`Unknown PDF type: ${type}`);
  }
}, { connection: redis, concurrency: 3 });

// Scheduling reminders
await queues.smsReminders.add(
  'appointment-reminder',
  { appuntamentoId },
  {
    delay: calculateDelayUntil24hBefore(appuntamento.dataOra),
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
  }
);
```

---

## 8. SICUREZZA

### 8.1 Autenticazione Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
└──────────────────────────────────────────────────────────────────┘

  Client                    API                     Database
    │                        │                          │
    │── POST /auth/login ───►│                          │
    │   {email, password}    │                          │
    │                        │── Verify credentials ───►│
    │                        │                          │
    │                        │◄── User + roles ─────────│
    │                        │                          │
    │                        │── Check MFA required ────│
    │                        │                          │
    │◄── 202 MFA_REQUIRED ───│  (if medico)            │
    │                        │                          │
    │── POST /auth/mfa ─────►│                          │
    │   {tempToken, otpCode} │                          │
    │                        │── Verify TOTP ──────────►│
    │                        │                          │
    │◄── 200 + JWT + Refresh─│                          │
    │                        │                          │
    │== Authenticated ======►│                          │
    │                        │                          │
```

### 8.2 Permission Matrix

| Ruolo | Pazienti | Appuntamenti | Visite | Referti | Firma | Fatture | Admin |
|-------|----------|--------------|--------|---------|-------|---------|-------|
| DIRETTORE_SANITARIO | RW | RW | RW | RW | ✅ | RW | ✅ |
| MEDICO_SPECIALISTA | R | R | RW | RW | ✅ | R | - |
| INFERMIERE | R | R | RW* | R | - | - | - |
| SEGRETERIA_MEDICA | RW | RW | R | R | - | RW | - |
| PAZIENTE | Self | Self | Self | Self | - | Self | - |

*RW* = Solo campi autorizzati

---

## 9. MONITORING E LOGGING

### 9.1 Metriche Chiave

```typescript
// Prometheus metrics
const metrics = {
  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  
  activeVisits: new Gauge({
    name: 'clinical_active_visits',
    help: 'Number of visits currently in progress',
  }),
  
  appointmentsToday: new Gauge({
    name: 'clinical_appointments_today',
    help: 'Total appointments for today',
    labelNames: ['status'],
  }),
  
  queueLength: new Gauge({
    name: 'bullmq_queue_length',
    help: 'Number of jobs in queue',
    labelNames: ['queue'],
  }),
};
```

### 9.2 Structured Logging

```typescript
// Pino logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'elementmedica-api',
    }),
  },
  redact: ['password', 'token', 'codiceFiscale', 'diagnosi'],
});

// Log clinico strutturato
logger.info({
  event: 'VISITA_COMPLETATA',
  visitaId,
  pazienteId,
  medicoId,
  durataMinuti,
  tenantId,
}, 'Visita completata con successo');
```

---

## 10. DISASTER RECOVERY

### 10.1 Backup Strategy

| Tipo | Frequenza | Retention | Storage |
|------|-----------|-----------|---------|
| Full DB | Giornaliero | 30 giorni | S3 Glacier |
| Incremental | Ogni 6 ore | 7 giorni | S3 Standard |
| WAL Archive | Continuo | 7 giorni | S3 Standard |
| Documents | Giornaliero | 90 giorni | S3 Glacier |

### 10.2 RTO/RPO

| Metrica | Target | Strategia |
|---------|--------|-----------|
| RPO (Recovery Point Objective) | < 1 ora | WAL archiving continuo |
| RTO (Recovery Time Objective) | < 4 ore | Standby replica + automation |

---

**Documento tecnico completo**: ✅
**Prossimo step**: Implementazione per fasi
