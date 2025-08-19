# 🔒 Guida End-to-End: Implementazione Funzioni GDPR-Compliant

**Data Creazione**: 29 Dicembre 2024  
**Versione Sistema**: Post-Refactoring Completo  
**Stato**: ✅ SISTEMA PRONTO PER NUOVE IMPLEMENTAZIONI  

---

## 📊 STATO ATTUALE SISTEMA (VERIFICATO)

### ✅ Refactoring Completato

#### Entità Unificate
- **✅ Person**: Entità principale unificata (sostituisce User + Employee)
- **❌ User**: RIMOSSA dal schema Prisma
- **❌ Employee**: RIMOSSA dal schema Prisma
- **✅ PersonRole**: Sistema ruoli moderno con RoleType enum

#### Soft Delete Standardizzato
- **✅ Standard**: Solo `deletedAt DateTime?` per tutte le entità
- **❌ Rimossi**: Campi `isDeleted` e `eliminato` da 8 entità
- **✅ GDPR-Compliant**: Audit trail completo con timestamp

#### Pulizia Codebase
- **✅ Test Files**: 112 file duplicati eliminati
- **✅ Documentation**: Consolidata in knowledge base
- **✅ Dependencies**: Mappate e verificate

### ⚠️ PROBLEMI IDENTIFICATI DA RISOLVERE

#### 1. Schema Prisma - Campo `isActive` Ridondante
```prisma
// PROBLEMA: Nel model Person c'è ancora isActive
model Person {
  // ...
  isActive Boolean @default(true)  // ❌ DA RIMUOVERE
  status   PersonStatus @default(ACTIVE)  // ✅ CORRETTO
  // ...
}
```

**Impatto**: 
- Duplicazione logica tra `isActive` e `status`
- Confusione per sviluppatori
- Query inconsistenti nel codice

#### 2. Codice Backend - Riferimenti a `isActive`
**File con riferimenti da aggiornare**:
- `services/authService.js` (linee 22, 26, 177, 185)
- `controllers/personController.js` (linee 40, 87, 123, 190, 235)
- `services/personService.js` (multiple occorrenze)
- `routes/auth-advanced.js` (multiple occorrenze)

---

## 🎯 ARCHITETTURA TARGET GDPR-COMPLIANT

### Principi Fondamentali

1. **Data Minimization**: Solo dati necessari
2. **Purpose Limitation**: Uso dati per scopi dichiarati
3. **Storage Limitation**: Retention period definiti
4. **Transparency**: Audit trail completo
5. **User Rights**: Accesso, rettifica, cancellazione

### Schema Entità Principale

```prisma
model Person {
  id                 String           @id @default(uuid())
  // Dati Identificativi
  firstName          String           @db.VarChar(100)
  lastName           String           @db.VarChar(100)
  email              String           @unique @db.VarChar(255)
  
  // Status Management (SOLO questo campo)
  status             PersonStatus     @default(ACTIVE)
  
  // GDPR Fields
  gdprConsentDate    DateTime?        @db.Timestamp(6)
  gdprConsentVersion String?          @db.VarChar(10)
  dataRetentionUntil DateTime?        @db.Date
  
  // Soft Delete (SOLO questo campo)
  deletedAt          DateTime?        @db.Timestamp(6)
  
  // Audit
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
  
  // Relations
  gdprAuditLogs      GdprAuditLog[]
  consentRecords     ConsentRecord[]
  personRoles        PersonRole[]
}

enum PersonStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING_VERIFICATION
}
```

---

## 🛠️ STEP-BY-STEP: IMPLEMENTAZIONE NUOVE FUNZIONI

### FASE 1: PREPARAZIONE AMBIENTE (30 min)

#### Step 1.1: Backup Sistema
```bash
# 1. Backup database
pg_dump -h localhost -U postgres -d database_name > backup_pre_new_feature_$(date +%Y%m%d_%H%M%S).sql

# 2. Backup codice
cp -r "/Users/matteo.michielon/project 2.0" "/Users/matteo.michielon/backup_project_$(date +%Y%m%d_%H%M%S)"
```

#### Step 1.2: Verifica Stato Sistema
```bash
# Test connettività database
node backend/test_simple_db.js

# Verifica schema Prisma
npx prisma validate

# Test autenticazione
node backend/test_auth_working.js
```

#### Step 1.3: Risoluzione Problemi Identificati

**A. Rimuovere campo `isActive` da Person**
```sql
-- Migration: Remove isActive field from Person
ALTER TABLE persons DROP COLUMN "isActive";

-- Update indexes
DROP INDEX IF EXISTS "persons_deletedAt_isActive_idx";
CREATE INDEX "persons_deletedAt_status_idx" ON "persons"("deletedAt", "status");
```

**B. Aggiornare Schema Prisma**
```prisma
// Rimuovere questa riga dal model Person
// isActive Boolean @default(true)  // ❌ RIMUOVERE

// Aggiornare indice
@@index([deletedAt, status])  // ✅ NUOVO
```

**C. Aggiornare Codice Backend**
```javascript
// PRIMA (❌ SBAGLIATO)
where: { isActive: true }

// DOPO (✅ CORRETTO)
where: { status: 'ACTIVE' }
```

### FASE 2: DESIGN NUOVA FUNZIONE (45 min)

#### Step 2.1: Analisi Requisiti GDPR

**Template Checklist**:
- [ ] **Lawful Basis**: Quale base giuridica?
- [ ] **Data Categories**: Quali dati personali?
- [ ] **Purpose**: Scopo specifico e limitato?
- [ ] **Retention**: Periodo conservazione?
- [ ] **User Rights**: Come garantire diritti utente?
- [ ] **Security**: Misure sicurezza appropriate?

#### Step 2.2: Design Schema Database

**Template Entità GDPR-Compliant**:
```prisma
model NuovaFunzione {
  id                String      @id @default(uuid())
  
  // Dati Funzionali
  campo1            String      @db.VarChar(255)
  campo2            Json?       // Per dati strutturati
  
  // GDPR Mandatory Fields
  personId          String      // Link a Person
  purpose           String      @db.VarChar(100)  // Scopo trattamento
  legalBasis        String      @db.VarChar(50)   // Base giuridica
  retentionUntil    DateTime?   @db.Date          // Scadenza dati
  
  // Audit Trail
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  createdBy         String?     // Chi ha creato
  
  // Soft Delete
  deletedAt         DateTime?   @db.Timestamp(6)
  
  // Relations
  person            Person      @relation(fields: [personId], references: [id])
  auditLogs         GdprAuditLog[]
  
  @@index([personId, deletedAt])
  @@index([retentionUntil])
  @@map("nuova_funzione")
}
```

#### Step 2.3: Design API Endpoints

**Template Controller GDPR-Compliant**:
```javascript
// controllers/nuovaFunzioneController.js
const { PrismaClient } = require('@prisma/client');
const { logGdprActivity } = require('../services/gdpr-service');

class NuovaFunzioneController {
  
  // CREATE - Con validazione GDPR
  async create(req, res) {
    try {
      const { personId, ...data } = req.body;
      
      // 1. Verifica consenso GDPR
      const person = await prisma.person.findUnique({
        where: { id: personId, deletedAt: null, status: 'ACTIVE' },
        include: { consentRecords: true }
      });
      
      if (!person) {
        return res.status(404).json({ error: 'Person not found or inactive' });
      }
      
      // 2. Verifica consenso specifico
      const hasConsent = person.consentRecords.some(c => 
        c.purpose === 'NUOVA_FUNZIONE' && 
        c.status === 'GRANTED' && 
        c.expiresAt > new Date()
      );
      
      if (!hasConsent) {
        return res.status(403).json({ 
          error: 'GDPR consent required',
          code: 'GDPR_CONSENT_MISSING'
        });
      }
      
      // 3. Calcola retention period
      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 2); // 2 anni
      
      // 4. Crea record
      const record = await prisma.nuovaFunzione.create({
        data: {
          ...data,
          personId,
          purpose: 'NUOVA_FUNZIONE',
          legalBasis: 'CONSENT',
          retentionUntil,
          createdBy: req.user.id
        }
      });
      
      // 5. Log attività GDPR
      await logGdprActivity({
        personId,
        action: 'CREATE_NUOVA_FUNZIONE',
        details: { recordId: record.id },
        performedBy: req.user.id
      });
      
      res.status(201).json({ success: true, data: record });
      
    } catch (error) {
      console.error('Error creating nuova funzione:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // READ - Con filtri privacy
  async getByPerson(req, res) {
    try {
      const { personId } = req.params;
      
      // Verifica autorizzazione
      if (personId !== req.user.id && !req.user.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const records = await prisma.nuovaFunzione.findMany({
        where: {
          personId,
          deletedAt: null,
          retentionUntil: { gt: new Date() } // Solo dati non scaduti
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({ success: true, data: records });
      
    } catch (error) {
      console.error('Error fetching records:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // DELETE - Soft delete GDPR-compliant
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      const record = await prisma.nuovaFunzione.update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      
      // Log cancellazione
      await logGdprActivity({
        personId: record.personId,
        action: 'DELETE_NUOVA_FUNZIONE',
        details: { recordId: id },
        performedBy: req.user.id
      });
      
      res.json({ success: true, message: 'Record deleted' });
      
    } catch (error) {
      console.error('Error deleting record:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new NuovaFunzioneController();
```

### FASE 3: IMPLEMENTAZIONE SICURA (60 min)

#### Step 3.1: Creazione Migration

```sql
-- migrations/add_nuova_funzione.sql
CREATE TABLE "nuova_funzione" (
  "id" TEXT NOT NULL,
  "campo1" VARCHAR(255) NOT NULL,
  "campo2" JSONB,
  "personId" TEXT NOT NULL,
  "purpose" VARCHAR(100) NOT NULL,
  "legalBasis" VARCHAR(50) NOT NULL,
  "retentionUntil" DATE,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(6) NOT NULL,
  "createdBy" TEXT,
  "deletedAt" TIMESTAMP(6),
  
  CONSTRAINT "nuova_funzione_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "nuova_funzione_personId_deletedAt_idx" ON "nuova_funzione"("personId", "deletedAt");
CREATE INDEX "nuova_funzione_retentionUntil_idx" ON "nuova_funzione"("retentionUntil");

-- Foreign Key
ALTER TABLE "nuova_funzione" ADD CONSTRAINT "nuova_funzione_personId_fkey" 
FOREIGN KEY ("personId") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### Step 3.2: Implementazione Routes

```javascript
// routes/v1/nuova-funzione.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth');
const nuovaFunzioneController = require('../../controllers/nuovaFunzioneController');
const { validateGdprConsent } = require('../../middleware/gdpr');

// Middleware GDPR per tutte le routes
router.use(authenticate);
router.use(validateGdprConsent);

// Routes
router.post('/', nuovaFunzioneController.create);
router.get('/person/:personId', nuovaFunzioneController.getByPerson);
router.delete('/:id', nuovaFunzioneController.delete);

// Route admin per export dati (Right to Data Portability)
router.get('/export/:personId', 
  authorize(['ADMIN', 'DPO']), 
  nuovaFunzioneController.exportPersonData
);

module.exports = router;
```

#### Step 3.3: Middleware GDPR

```javascript
// middleware/gdpr.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Validazione consenso GDPR
const validateGdprConsent = async (req, res, next) => {
  try {
    const personId = req.body.personId || req.params.personId || req.user.id;
    
    // Verifica consenso attivo
    const activeConsent = await prisma.consentRecord.findFirst({
      where: {
        personId,
        purpose: 'DATA_PROCESSING',
        status: 'GRANTED',
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!activeConsent) {
      return res.status(403).json({
        error: 'GDPR consent required',
        code: 'GDPR_CONSENT_EXPIRED',
        message: 'Please renew your data processing consent'
      });
    }
    
    req.gdprConsent = activeConsent;
    next();
    
  } catch (error) {
    console.error('GDPR validation error:', error);
    res.status(500).json({ error: 'GDPR validation failed' });
  }
};

// Audit automatico
const auditGdprActivity = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log solo se operazione riuscita
      if (res.statusCode < 400) {
        logGdprActivity({
          personId: req.body.personId || req.params.personId || req.user.id,
          action,
          details: { endpoint: req.originalUrl, method: req.method },
          performedBy: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }).catch(console.error);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  validateGdprConsent,
  auditGdprActivity
};
```

### FASE 4: TESTING E VALIDAZIONE (45 min)

#### Step 4.1: Test Unitari

```javascript
// tests/nuova-funzione.test.js
const request = require('supertest');
const app = require('../app');
const { PrismaClient } = require('@prisma/client');

describe('Nuova Funzione GDPR Tests', () => {
  let authToken;
  let testPersonId;
  
  beforeAll(async () => {
    // Setup test data
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = loginResponse.body.token;
    testPersonId = loginResponse.body.user.id;
  });
  
  test('Should require GDPR consent', async () => {
    const response = await request(app)
      .post('/api/v1/nuova-funzione')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        personId: testPersonId,
        campo1: 'test data'
      });
    
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('GDPR_CONSENT_MISSING');
  });
  
  test('Should create record with valid consent', async () => {
    // Prima crea consenso
    await request(app)
      .post('/api/v1/gdpr/consent')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        purpose: 'NUOVA_FUNZIONE',
        status: 'GRANTED'
      });
    
    // Poi crea record
    const response = await request(app)
      .post('/api/v1/nuova-funzione')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        personId: testPersonId,
        campo1: 'test data'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.retentionUntil).toBeDefined();
  });
  
  test('Should respect data retention', async () => {
    // Test che dati scaduti non vengano restituiti
    const response = await request(app)
      .get(`/api/v1/nuova-funzione/person/${testPersonId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    // Verifica che solo dati non scaduti siano inclusi
    response.body.data.forEach(record => {
      expect(new Date(record.retentionUntil)).toBeGreaterThan(new Date());
    });
  });
});
```

#### Step 4.2: Test GDPR Compliance

```javascript
// tests/gdpr-compliance.test.js
describe('GDPR Compliance Tests', () => {
  
  test('Right to Access - Should export all user data', async () => {
    const response = await request(app)
      .get(`/api/v1/gdpr/export/${testPersonId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('person');
    expect(response.body.data).toHaveProperty('nuovaFunzione');
    expect(response.body.data).toHaveProperty('auditLogs');
  });
  
  test('Right to Erasure - Should delete all user data', async () => {
    const response = await request(app)
      .delete(`/api/v1/gdpr/erase/${testPersonId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    
    // Verifica che tutti i dati siano soft-deleted
    const person = await prisma.person.findUnique({
      where: { id: testPersonId }
    });
    expect(person.deletedAt).not.toBeNull();
  });
  
  test('Data Retention - Should auto-delete expired data', async () => {
    // Simula scadenza dati
    await prisma.nuovaFunzione.updateMany({
      where: { personId: testPersonId },
      data: { retentionUntil: new Date('2020-01-01') }
    });
    
    // Esegui cleanup automatico
    await request(app)
      .post('/api/v1/gdpr/cleanup')
      .set('Authorization', `Bearer ${adminToken}`);
    
    // Verifica che dati scaduti siano stati eliminati
    const expiredRecords = await prisma.nuovaFunzione.findMany({
      where: {
        personId: testPersonId,
        retentionUntil: { lt: new Date() },
        deletedAt: null
      }
    });
    
    expect(expiredRecords).toHaveLength(0);
  });
});
```

### FASE 5: DEPLOYMENT E MONITORAGGIO (30 min)

#### Step 5.1: Pre-deployment Checklist

```bash
#!/bin/bash
# scripts/pre-deployment-gdpr-check.sh

echo "🔍 GDPR Compliance Pre-deployment Check"

# 1. Verifica schema Prisma
echo "Validating Prisma schema..."
npx prisma validate || exit 1

# 2. Test GDPR compliance
echo "Running GDPR compliance tests..."
npm test -- --testPathPattern=gdpr-compliance || exit 1

# 3. Verifica audit logs
echo "Checking audit log functionality..."
node scripts/test-audit-logs.js || exit 1

# 4. Verifica data retention
echo "Testing data retention policies..."
node scripts/test-data-retention.js || exit 1

# 5. Security scan
echo "Running security audit..."
npm audit --audit-level=moderate || exit 1

echo "✅ All GDPR compliance checks passed!"
```

#### Step 5.2: Monitoring Setup

```javascript
// scripts/gdpr-monitoring.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Monitor data retention compliance
const checkDataRetention = async () => {
  const expiredRecords = await prisma.nuovaFunzione.count({
    where: {
      retentionUntil: { lt: new Date() },
      deletedAt: null
    }
  });
  
  if (expiredRecords > 0) {
    console.warn(`⚠️ GDPR Alert: ${expiredRecords} records past retention period`);
    // Invia alert
  }
};

// Monitor consent expiration
const checkConsentExpiration = async () => {
  const expiringConsents = await prisma.consentRecord.count({
    where: {
      expiresAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 giorni
      },
      status: 'GRANTED'
    }
  });
  
  if (expiringConsents > 0) {
    console.warn(`⚠️ GDPR Alert: ${expiringConsents} consents expiring in 7 days`);
  }
};

// Esegui controlli ogni ora
setInterval(async () => {
  await checkDataRetention();
  await checkConsentExpiration();
}, 60 * 60 * 1000);
```

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### Pre-Implementazione
- [ ] Backup sistema completato
- [ ] Schema Prisma validato
- [ ] Problemi `isActive` risolti
- [ ] Test baseline eseguiti

### Design
- [ ] Requisiti GDPR analizzati
- [ ] Base giuridica identificata
- [ ] Schema database progettato
- [ ] API endpoints definiti
- [ ] Periodo retention stabilito

### Implementazione
- [ ] Migration database creata
- [ ] Controller implementato
- [ ] Routes configurate
- [ ] Middleware GDPR attivato
- [ ] Audit logging implementato

### Testing
- [ ] Test unitari scritti
- [ ] Test GDPR compliance eseguiti
- [ ] Test data retention verificati
- [ ] Security audit completato

### Deployment
- [ ] Pre-deployment check eseguito
- [ ] Monitoring configurato
- [ ] Documentation aggiornata
- [ ] Team training completato

---

## 🚨 REGOLE CRITICHE DA RISPETTARE

### 1. Schema Database
- **✅ SEMPRE**: Usare solo `deletedAt` per soft delete
- **❌ MAI**: Usare `isDeleted`, `eliminato`, o `isActive`
- **✅ SEMPRE**: Includere campi GDPR (consent, retention, audit)

### 2. API Design
- **✅ SEMPRE**: Validare consenso GDPR prima di operazioni
- **✅ SEMPRE**: Loggare attività per audit trail
- **✅ SEMPRE**: Rispettare data retention periods
- **❌ MAI**: Restituire dati di utenti diversi senza autorizzazione

### 3. Sicurezza
- **✅ SEMPRE**: Autenticare e autorizzare ogni endpoint
- **✅ SEMPRE**: Validare input utente
- **✅ SEMPRE**: Usare HTTPS in produzione
- **❌ MAI**: Loggare dati sensibili in plain text

### 4. GDPR Compliance
- **✅ SEMPRE**: Documentare base giuridica per ogni trattamento
- **✅ SEMPRE**: Implementare diritti utente (accesso, rettifica, cancellazione)
- **✅ SEMPRE**: Rispettare principio minimizzazione dati
- **❌ MAI**: Conservare dati oltre il periodo necessario

---

## 📞 SUPPORTO E RISORSE

### Documentazione di Riferimento
- **Schema Prisma**: `/backend/prisma/schema.prisma`
- **GDPR Service**: `/backend/services/gdpr-service.js`
- **Auth Middleware**: `/backend/middleware/auth.js`
- **Knowledge Base**: `/docs/10_project_managemnt/7_refactoring_completo_sistema/KNOWLEDGE_BASE_ERRORI.md`

### Contatti Team
- **DPO (Data Protection Officer)**: [email]
- **Tech Lead**: [email]
- **Security Team**: [email]

---

**Ultimo Aggiornamento**: 29 Dicembre 2024  
**Prossima Revisione**: 15 Gennaio 2025  
**Versione Documento**: 1.0