# GDPR Compliance - Backend

**Ultimo aggiornamento**: 2026-02-03  
**Versione**: 2.0.0

## 🎯 Overview

Questo documento descrive le misure di conformità GDPR implementate nel backend di ElementMedica.

---

## 📊 Modelli GDPR

### GdprAuditLog
Traccia tutte le operazioni su dati personali:

```prisma
model GdprAuditLog {
  id           String    @id @default(uuid())
  personId     String?   // Chi ha eseguito l'azione
  action       String    // Tipo di azione (DELETE_PII, HARD_DELETE_PII, OAUTH_DISCONNECT, etc.)
  resourceType String?   // Tipo di risorsa (Person, ContactSubmission, etc.)
  resourceId   String?   // ID della risorsa
  dataAccessed Json?     // Dettagli dell'operazione
  ipAddress    String?
  userAgent    String?
  companyId    String?
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?
  tenantId     String
}
```

### ConsentRecord
Gestisce i consensi degli utenti:

```prisma
model ConsentRecord {
  id             String    @id @default(uuid())
  personId       String
  consentType    String    // MARKETING, NEWSLETTER, PROFILING, etc.
  consentGiven   Boolean
  consentVersion String?
  givenAt        DateTime  @default(now())
  withdrawnAt    DateTime?
  ipAddress      String?
  userAgent      String?
  deletedAt      DateTime?
  tenantId       String
}
```

---

## 🔒 PII Sanitization nei Log

**File**: `backend/utils/logger.js`

Il logger Winston include sanitizzazione automatica di PII:

```javascript
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,6}/g,
  taxCode: /[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]/gi,
  iban: /[A-Z]{2}\d{2}[A-Z0-9]{4,30}/gi,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  partitaIva: /\b\d{11}\b/g,
  jwt: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  password: /"password"\s*:\s*"[^"]+"/gi
};
```

### Funzioni disponibili

```javascript
import { sanitizePII } from '../utils/logger.js';

// Sanitizza una stringa
const safe = sanitizePII('Email: user@example.com');
// Output: "Email: [REDACTED_EMAIL]"

// Sanitizza un oggetto
const safeObj = sanitizePII({ email: 'test@test.com', name: 'John' });
// Output: { email: "[REDACTED_EMAIL]", name: "John" }
```

### Configurazione

- In **production**: PII sempre sanitizzato
- In **development**: PII sanitizzato di default
- Per disabilitare in dev: `LOG_DISABLE_PII_SANITIZATION=true`

---

## 🗑️ Delete Operations

### Regola #1: Soft Delete per PII

TUTTI i modelli con PII devono avere `deletedAt DateTime?` e usare soft delete:

```javascript
// ✅ CORRETTO
await prisma.person.update({
  where: { id: personId },
  data: { deletedAt: new Date() }
});

// ❌ MAI usare per PII
await prisma.person.delete({ where: { id: personId } });
```

### Regola #2: deletionReason Obbligatorio

Per qualsiasi delete di PII, è richiesto un `deletionReason` con minimo 10 caratteri:

```javascript
// API endpoint
router.delete('/resource/:id', async (req, res) => {
  const { deletionReason } = req.body;
  
  if (!deletionReason || deletionReason.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Motivo eliminazione obbligatorio (minimo 10 caratteri)'
    });
  }
  
  // Procedi con delete
});
```

### Regola #3: GdprAuditLog PRIMA del Delete

```javascript
// SEMPRE creare audit log PRIMA della cancellazione
await prisma.gdprAuditLog.create({
  data: {
    personId: req.person.id, // Chi esegue l'azione
    action: 'DELETE_PII',
    resourceType: 'ContactSubmission', // Tipo risorsa
    resourceId: id, // ID risorsa
    dataAccessed: {
      deletionReason,
      piiFields: ['name', 'email', 'phone'], // Quali campi PII
      snapshotAt: new Date().toISOString()
    },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    tenantId
  }
});

// POI cancella
await prisma.contactSubmission.delete({ where: { id } });
```

---

## ✅ Modelli Compliant

| Modello | Soft Delete | GdprAuditLog | Note |
|---------|-------------|--------------|------|
| Person | ✅ | ✅ | Via PersonCRUDService |
| PersonTenantProfile | ✅ | ✅ | Via PersonCRUDService |
| Company | ✅ | ✅ | |
| CompanyTenantProfile | ✅ | ✅ | |
| ContactSubmission | ❌ Hard | ✅ | deletionReason obbligatorio |
| GoogleTokens | ❌ Hard | ✅ | OAuth tokens, non PII diretto |
| ConsentRecord | ✅ | N/A | |
| GdprAuditLog | ✅ | N/A | |

---

## 🔐 Hard Delete - Casi Eccezionali

Il metodo `PersonCRUDService.hardDeletePerson()` è **@deprecated** e richiede:

```javascript
// TUTTI i parametri sono obbligatori
await PersonCRUDService.hardDeletePerson(
  personId,      // ID persona da eliminare
  tenantId,      // Tenant ID
  deletionReason, // Minimo 10 caratteri
  requesterId    // Chi richiede la cancellazione
);
```

Questo crea automaticamente un `GdprAuditLog` con:
- `action: 'HARD_DELETE_PII'`
- `resourceType: 'Person'`
- `dataAccessed` con snapshot dei campi PII eliminati

---

## 📤 Data Export

Endpoint per esportazione dati utente (Art. 20 GDPR):

```
GET /api/v1/gdpr/data-export
```

Esporta tutti i dati personali dell'utente autenticato in formato JSON.

---

## ⏰ Data Retention

Configurazione in `.env`:

```bash
GDPR_DATA_RETENTION_DAYS=2555      # ~7 anni per dati clinici
GDPR_AUDIT_RETENTION_DAYS=3650     # 10 anni per audit log
GDPR_CONSENT_EXPIRY_DAYS=365       # 1 anno per consensi
```

Retention per tipo di log:
- `AUTH`: 365 giorni
- `CRUD`: 180 giorni  
- `NAVIGATION`: 90 giorni

---

## 🛡️ Security Fixes Applicati

### 1. SQL Injection Prevention

**File modificati**:
- `services/clinical/FatturaSanitariaService.js`
- `services/notifications/NotificationAnalyticsService.js`

Tutte le query raw ora usano parameterized queries:

```javascript
// ❌ VULNERABILE
await prisma.$queryRawUnsafe(`SELECT * FROM table WHERE date > '${userInput}'`);

// ✅ SICURO
await prisma.$queryRaw`SELECT * FROM table WHERE date > ${userInput}::timestamp`;
```

### 2. Password Hash Protection

**File**: `services/authService.js`

Rimosso logging di password prefix:
```javascript
// ❌ RIMOSSO
logger.debug('Password check', { passwordPrefix: hash.substring(0, 10) });

// ✅ Ora solo
logger.debug('Password check', { personId });
```

### 3. Rate Limiting Hardened

**File**: `config/rateLimiting.js`

Login rate limit ridotto:
```javascript
// Prima: max: 200
// Dopo:
loginLimiter: {
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 10 // Solo 10 tentativi
}
```

### 4. Granularity Whitelist

**File**: `services/notifications/NotificationAnalyticsService.js`

Validazione whitelist per parametri dinamici:
```javascript
const ALLOWED_GRANULARITY = ['day', 'week', 'month'];
if (!ALLOWED_GRANULARITY.includes(granularity)) {
  throw new Error('Invalid granularity');
}
```

---

## 📚 Riferimenti

- [GDPR Art. 17 - Diritto alla cancellazione](https://gdpr.eu/article-17-right-to-be-forgotten/)
- [GDPR Art. 20 - Diritto alla portabilità](https://gdpr.eu/article-20-right-to-data-portability/)
- [GDPR Art. 25 - Privacy by Design](https://gdpr.eu/article-25-data-protection-by-design/)
- [GDPR Art. 32 - Sicurezza del trattamento](https://gdpr.eu/article-32-security-of-processing/)
