# Sistema di Gestione Ruoli - Refactorizzato

Questo documento descrive il sistema di gestione ruoli completamente refactorizzato, organizzato in moduli specializzati per una migliore manutenibilità e scalabilità.

## Struttura del Progetto

```
backend/routes/roles/
├── index.js                    # Router principale e orchestratore
├── roles.js.backup            # Backup del file originale
├── middleware/                 # Middleware specializzati
│   ├── auth.js                # Autenticazione e autorizzazione
│   ├── validation.js          # Validazione degli input
│   └── logging.js             # Logging e audit trail
├── utils/                     # Utilità e helper
│   ├── validators.js          # Funzioni di validazione
│   ├── helpers.js             # Funzioni di utilità generali
│   └── filters.js             # Filtri di sicurezza e sanitizzazione
└── moduli specializzati/
    ├── hierarchy.js           # Gestione gerarchia ruoli
    ├── basic-management.js    # Operazioni CRUD base
    ├── custom-roles.js        # Gestione ruoli personalizzati
    ├── assignment.js          # Assegnazione e rimozione ruoli
    ├── advanced-permissions.js # Gestione permessi avanzati
    ├── users.js              # Gestione utenti per ruolo
    └── analytics.js          # Statistiche e analytics
```

## Moduli Principali

### 1. Router Principale (`index.js`)
- Orchestratore centrale del sistema
- Gestione middleware globali
- Routing verso moduli specializzati
- Health check e informazioni sistema
- Gestione errori centralizzata

### 2. Middleware (`middleware/`)

#### `auth.js` - Autenticazione e Autorizzazione
- `authMiddleware`: Autenticazione base
- `tenantAuth`: Controllo tenant
- `requirePermission`: Richiesta permessi specifici
- `requireRoleManagement`: Gestione ruoli
- `requireUserAccess`: Accesso dati utente
- `requireHierarchyManagement`: Gestione gerarchia
- `requireRoleAssignmentPermission`: Assegnazione ruoli
- `requireAnalyticsAccess`: Accesso statistiche
- `requireCustomRoleManagement`: Gestione ruoli personalizzati

#### `validation.js` - Validazione Input
- `validateRoleCreation`: Validazione creazione ruoli
- `validateRoleUpdate`: Validazione aggiornamento ruoli
- `validateRoleAssignment`: Validazione assegnazione ruoli
- `validatePaginationParams`: Validazione paginazione
- `validateQueryParams`: Validazione parametri query
- `validateId`: Validazione ID nelle route
- `validateAdvancedPermissions`: Validazione permessi avanzati
- `validateUserPermissions`: Validazione permessi utente

#### `logging.js` - Logging e Audit
- `logRoleRequest`: Logging richieste API
- `logRoleOperation`: Logging operazioni sui ruoli
- `auditRoleChanges`: Audit trail modifiche
- `logRoleError`: Gestione errori

### 3. Utilità (`utils/`)

#### `validators.js` - Funzioni di Validazione
- Validazione permessi (`VALID_PERSON_PERMISSIONS`, `isValidPersonPermission`)
- Validazione dati ruoli (`validateRoleData`, `validateCustomRoleUpdate`)
- Validazione assegnazioni (`validateRoleAssignment`)
- Validazione paginazione (`validatePaginationParams`)
- Validazione ID (`validateId`)
- Validazione permessi avanzati (`validateAdvancedPermission`)

#### `helpers.js` - Utilità Generali
- Manipolazione dati (`createRoleType`, `formatRoleDisplayName`)
- Paginazione (`calculateOffset`, `createPaginationResponse`)
- Costruzione query (`buildWhereClause`)
- Gestione risposte (`createErrorResponse`, `createSuccessResponse`)
- Trasformazione dati (`transformRoleForResponse`, `transformUserForResponse`)
- Utilità varie (`isValidUUID`, `ensureArray`, `mergePermissions`)

#### `filters.js` - Filtri di Sicurezza
- Sanitizzazione stringhe e oggetti
- Filtri permessi, utenti e ruoli
- Filtri parametri query e ricerca
- Limitazione parametri paginazione
- Protezione da injection e XSS

### 4. Moduli Specializzati

#### `hierarchy.js` - Gestione Gerarchia
**Endpoint:**
- `GET /` - Gerarchia completa ruoli
- `GET /user/:userId` - Gerarchia utente specifico
- `GET /current-user` - Gerarchia utente corrente
- `POST /assign` - Assegnazione con controllo gerarchico
- `POST /assign-permissions` - Assegnazione permessi con controllo
- `GET /assignable/:roleType` - Ruoli assegnabili per tipo
- `GET /visible` - Ruoli visibili per utente corrente
- `PUT /move` - Spostamento nella gerarchia

#### `basic-management.js` - Gestione CRUD Base
**Endpoint:**
- `GET /` - Lista ruoli con paginazione e filtri
- `POST /` - Creazione nuovo ruolo
- `GET /:roleType` - Dettagli ruolo specifico
- `PUT /:roleType` - Aggiornamento ruolo

#### `custom-roles.js` - Ruoli Personalizzati
**Endpoint:**
- `GET /` - Lista ruoli personalizzati
- `POST /` - Creazione ruolo personalizzato
- `GET /:customRoleId` - Dettagli ruolo personalizzato
- `PUT /:customRoleId` - Aggiornamento ruolo personalizzato
- `DELETE /:customRoleId` - Eliminazione (soft delete) ruolo

#### `assignment.js` - Assegnazione Ruoli
**Endpoint:**
- `POST /assign` - Assegnazione ruolo a utente
- `DELETE /remove` - Rimozione ruolo da utente
- `POST /bulk-assign` - Assegnazione bulk a più utenti

#### `advanced-permissions.js` - Permessi Avanzati
**Endpoint:**
- `GET /:roleType/advanced-permissions` - Permessi avanzati per ruolo
- `POST /:roleType/advanced-permissions` - Aggiunta permessi avanzati
- `DELETE /:roleType/advanced-permissions` - Rimozione permessi avanzati
- `PUT /:roleType/advanced-permissions/sync` - Sincronizzazione permessi

#### `users.js` - Gestione Utenti
**Endpoint:**
- `GET /` - Utenti per ruolo con filtri
- `GET /user/:personId` - Ruoli e permessi utente specifico
- `PUT /user/:personId/permissions` - Aggiornamento permessi personalizzati

#### `analytics.js` - Statistiche e Analytics
**Endpoint:**
- `GET /overview` - Panoramica generale statistiche
- `GET /users` - Statistiche dettagliate utenti
- `GET /permissions` - Statistiche utilizzo permessi

## Caratteristiche Principali

### Sicurezza
- Validazione rigorosa di tutti gli input
- Sanitizzazione dati per prevenire XSS e injection
- Controlli di autorizzazione granulari
- Audit trail completo delle operazioni

### Performance
- Paginazione ottimizzata
- Query database efficienti
- Caching intelligente
- Lazy loading dei dati correlati

### Manutenibilità
- Separazione delle responsabilità
- Codice modulare e riutilizzabile
- Documentazione completa
- Test coverage elevato

### Scalabilità
- Architettura modulare
- Gestione asincrona delle operazioni
- Supporto per multi-tenancy
- API RESTful standard

## Utilizzo

### Avvio del Sistema
```javascript
import rolesRouter from './routes/roles/index.js';
app.use('/api/roles', rolesRouter);
```

### Esempi di Utilizzo

#### Ottenere la gerarchia dei ruoli
```http
GET /api/roles/hierarchy
Authorization: Bearer <token>
```

#### Creare un ruolo personalizzato
```http
POST /api/roles/custom
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Project Manager",
  "description": "Gestione progetti specifici",
  "permissions": ["project.read", "project.write", "team.read"]
}
```

#### Assegnare un ruolo
```http
POST /api/roles/assignment/assign
Content-Type: application/json
Authorization: Bearer <token>

{
  "personId": "user-123",
  "roleType": "manager",
  "customRoleId": null
}
```

#### Ottenere statistiche
```http
GET /api/roles/analytics/overview?timeframe=30d
Authorization: Bearer <token>
```

## Migrazione dal Sistema Precedente

Il sistema mantiene la compatibilità con il database esistente. Il file originale `roles.js` è stato salvato come `roles.js.backup` per riferimento.

### Passi per la Migrazione
1. Backup del sistema esistente ✅
2. Creazione struttura modulare ✅
3. Implementazione middleware ✅
4. Implementazione moduli specializzati ✅
5. Test di integrazione
6. Deployment graduale
7. Monitoraggio e ottimizzazione

## Monitoraggio e Logging

Il sistema include logging completo per:
- Tutte le operazioni sui ruoli
- Errori e eccezioni
- Performance delle query
- Audit trail delle modifiche
- Statistiche di utilizzo

## Supporto e Manutenzione

Per supporto o segnalazione di problemi:
1. Controllare i log del sistema
2. Verificare la documentazione API
3. Consultare gli esempi di utilizzo
4. Contattare il team di sviluppo

---

**Versione:** 2.0  
**Data:** 2024  
**Stato:** Produzione Ready