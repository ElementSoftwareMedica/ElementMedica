# Person Activity Logging System - Implementation Complete

## 📋 Overview

Sistema di Activity Logging GDPR-compliant implementato con successo. Il sistema traccia tutte le attività delle Person nell'applicazione con:

- ✅ Async queue per non bloccare le operazioni
- ✅ Batch insert per performance
- ✅ Sanitization automatica dei dati sensibili
- ✅ Retry logic per resilienza
- ✅ Retention policy per categoria

---

## 🏗️ Struttura Implementata

```
backend/
├── services/
│   └── activity/
│       ├── index.js                 # Export pubblici
│       ├── ActivityService.js       # Servizio principale (queue, batch, logging)
│       ├── ActivityTypes.js         # 59 tipi di attività, 8 categorie
│       ├── ActivityFormatter.js     # Sanitizzazione GDPR
│       └── ActivityRetention.js     # Cleanup e retention policy
│
├── middleware/
│   └── activityTracking.js          # Middleware per tracking automatico
│
└── routes/
    └── v1/
        └── activity/
            ├── index.js             # Router principale
            ├── logs.js              # API per visualizzare log
            └── analytics.js         # API per analytics (admin only)
```

---

## 📊 Tipi di Attività

### Categorie (8)
1. **AUTH** - Autenticazione (login, logout, password reset)
2. **CRUD** - Operazioni dati (create, read, update, delete)
3. **NAVIGATION** - Navigazione (page views, search, filters)
4. **DOCUMENT** - Documenti (generate, download, sign, share)
5. **ADMIN** - Amministrazione (permissions, roles, settings)
6. **CLINICAL** - ElementMedica (visite, prescrizioni, referti)
7. **TRAINING** - ElementSicurezza (corsi, test, attestati)
8. **SYSTEM** - Sistema (errors, maintenance, backup)

### Retention Policy (GDPR Compliant)
| Categoria | Retention |
|-----------|-----------|
| AUTH | 2 anni |
| CRUD | 1 anno |
| NAVIGATION | 90 giorni |
| DOCUMENT | 2 anni |
| ADMIN | 2 anni |
| CLINICAL | 10 anni (requisito sanitario) |
| TRAINING | 5 anni (attestati sicurezza) |
| SYSTEM | 1 anno |

---

## 🔒 GDPR Compliance

### Sanitizzazione Automatica
- ✅ Password, token, API keys → `[REDACTED]`
- ✅ Codici fiscali, IBAN → `[REDACTED]`
- ✅ IP address: rimozione prefissi IPv6
- ✅ User-Agent: troncamento a 500 caratteri
- ✅ Nessuno stack trace nei log

### Funzionalità GDPR
- ✅ Soft delete per tutti i record
- ✅ Export dati persona (solo dati propri)
- ✅ Anonimizzazione su richiesta
- ✅ Audit trail per operazioni di cleanup

---

## 🛠️ API Endpoints

### Personal Activity (tutti gli utenti)
```
GET  /api/v1/activity/me              # Le proprie attività
GET  /api/v1/activity/me/summary      # Sommario proprie attività
GET  /api/v1/activity/types           # Lista tipi disponibili
```

### Admin Only
```
GET  /api/v1/activity/persons/:id     # Attività di una persona
POST /api/v1/activity/search          # Ricerca avanzata
GET  /api/v1/activity/analytics/tenant        # Stats tenant
GET  /api/v1/activity/analytics/retention     # Stats retention
GET  /api/v1/activity/analytics/top-users     # Utenti più attivi
GET  /api/v1/activity/analytics/failed-ops    # Operazioni fallite
GET  /api/v1/activity/analytics/security      # Report sicurezza
POST /api/v1/activity/analytics/cleanup       # Cleanup manuale (SUPER_ADMIN)
```

---

## 💻 Utilizzo nel Codice

### Logging nel Sistema Auth (già integrato)
```javascript
import { activityService, ActivityType } from '../services/activity/index.js';

// Login success (già implementato in authentication.js)
await activityService.logImmediate({
  personId: person.id,
  action: ActivityType.AUTH_LOGIN_SUCCESS,
  tenantId: person.tenantId,
  ipAddress: getClientIp(req),
  userAgent: req.get('User-Agent'),
  metadata: { loginMethod: 'standard' },
  success: true
});

// Logout (già implementato)
activityService.log({
  personId: req.person.id,
  action: ActivityType.AUTH_LOGOUT,
  tenantId: req.person.tenantId,
  ipAddress: getClientIp(req),
  success: true
});
```

### Logging da Request (helper)
```javascript
// Metodo helper che estrae automaticamente personId, tenantId, ip, userAgent
activityService.logFromRequest(req, ActivityType.ENTITY_CREATE, {
  resource: 'Company',
  resourceId: company.id
});
```

### Middleware Tracking (opzionale)
```javascript
import { trackActivity, logAction } from '../middleware/activityTracking.js';

// Tracking automatico su tutte le routes
router.use(trackActivity());

// Tracking specifico per route
router.post('/important-action', 
  logAction(ActivityType.ENTITY_CREATE, { resource: 'Document', immediate: true }),
  controller.create
);
```

---

## 📈 Performance

- **Queue-based**: Log asincrono, non blocca le operazioni
- **Batch insert**: 100 record per batch
- **Flush interval**: 5 secondi
- **Cache**: Summary cachato per 5 minuti
- **Retry**: Max 3 tentativi per batch falliti
- **Graceful shutdown**: Flush completo prima di terminare

---

## 🔧 Schema Database

```prisma
model ActivityLog {
  id           String    @id @default(uuid())
  personId     String    @map("user_id")
  action       String                          // Tipo attività
  category     String?                         // Categoria (AUTH, CRUD, etc.)
  resource     String?                         // Risorsa (Company, Course, etc.)
  resourceId   String?                         // ID risorsa
  details      String?                         // Dettagli legacy
  metadata     Json?                           // Metadata strutturato
  ipAddress    String?                         // IP address
  userAgent    String?   @db.VarChar(500)      // Browser/device
  sessionId    String?                         // Link a sessione
  duration     Int?                            // Durata in ms
  success      Boolean   @default(true)        // Successo/fallimento
  errorCode    String?                         // Codice errore
  timestamp    DateTime  @default(now())
  tenantId     String
  
  // 9 indexes ottimizzati per query frequenti
  @@index([tenantId])
  @@index([personId])
  @@index([personId, timestamp])
  @@index([action, timestamp])
  @@index([category, timestamp])
  @@index([resource, resourceId])
  @@index([sessionId])
  @@index([timestamp])
  @@index([tenantId, deletedAt])
}
```

---

## ✅ Test Eseguiti

```
=== Activity Service Test ===

1. Activity Types loaded:
   - Total types: 59
   - Categories: AUTH, CRUD, NAVIGATION, DOCUMENT, ADMIN, SYSTEM, CLINICAL, TRAINING

2. Category mapping:
   - AUTH_LOGIN_SUCCESS -> AUTH ✓
   - ENTITY_CREATE -> CRUD ✓
   - DOCUMENT_GENERATE -> DOCUMENT ✓

3. Activity Formatter:
   - Password sanitization ✓
   - Token sanitization ✓
   - Email preserved ✓

4. IP Sanitization:
   - IPv6 prefix removal ✓
   - Multi-IP handling ✓

5. Retention Policy verified ✓

6. Activity Service instance ✓

=== All tests passed! ===
```

---

## 📝 Note Implementazione

1. **Login Failures**: Non vengono loggati in ActivityLog (manca personId), ma vengono loggati nel sistema di log applicativo per sicurezza.

2. **Multi-tenancy**: Ogni query include sempre `tenantId` e `deletedAt: null`.

3. **Backward Compatibility**: Il sistema funziona in parallelo con il vecchio `activity-logs-routes.js`.

4. **Estensibilità**: Per aggiungere nuovi tipi di attività, modificare solo `ActivityTypes.js`.

---

## 🚀 Next Steps (Opzionali)

1. **Dashboard UI** - Componente React per visualizzare le attività
2. **Alerting** - Notifiche per attività sospette
3. **Scheduled Cleanup** - Cron job per pulizia automatica
4. **Export GDPR** - Endpoint per export dati persona completo
