# 🚀 Project 2.0 - Regole del Progetto
**Versione 4.0 Post-Ottimizzazione Server**
*Sistema Refactorizzato, Ottimizzato e GDPR-Compliant*

## 🔒 Regole Assolute

### 1. **Entità Unificata Person**
- ✅ **SOLO Person** - Entità unificata per tutti gli utenti
- ❌ **VIETATO** - User, Employee (entità obsolete)

### 2. **Soft Delete Standardizzato**
- ✅ **SOLO deletedAt** - Campo timestamp per soft delete
- ❌ **VIETATO** - eliminato, isDeleted (campi obsoleti)

### 3. **Sistema Ruoli Unificato**
- ✅ **SOLO PersonRole + RoleType** - Sistema ruoli standardizzato
- ❌ **VIETATO** - UserRole, Role (entità obsolete)

### 4. **Conformità GDPR Obbligatoria**
- ✅ **Template GDPR** - Obbligatorio per nuove pagine entità
- ✅ **Audit Trail** - Tracciamento obbligatorio azioni
- ✅ **Gestione Consensi** - Sistema consensi integrato

### 5. **Ordine e Manutenibilità**
- ✅ **Codice Pulito** - Nessun file temporaneo in root/backend
- ✅ **Documentazione Aggiornata** - Corrispondenza con stato reale
- ✅ **Planning Operativo** - Per ogni operazione significativa

### 6. **Comunicazione in Italiano**
- ✅ **Lingua Italiana** - Per documentazione e comunicazione

## 🏗️ Architettura Sistema Ottimizzata

### 🚨 Configurazione Server CRITICA
**PORTE FISSE - NON MODIFICARE MAI:**
- **API Server**: Porta 4001 ✅ (Ottimizzato e Modulare)
- **Proxy Server**: Porta 4003 ✅ (Ottimizzato con Middleware)
- **Frontend**: Porta 5173 (Configurato per proxy 4003)
- **Documents Server**: Porta 4002 (Opzionale - verificare necessità)

### 🔧 Architettura Modulare Implementata
**Backend Ottimizzato (Progetti 16-17):**
```
backend/
├── servers/                    # Server principali
│   ├── api-server.js          # API Server ottimizzato (195 righe)
│   ├── proxy-server.js        # Proxy Server modulare
│   └── documents-server.js    # Documents Server
├── proxy/                     # Moduli Proxy (Progetto 16)
│   ├── config/               # Configurazioni centralizzate
│   ├── middleware/           # Middleware modulari
│   ├── handlers/             # Handler specializzati
│   ├── routes/               # Route configuration
│   └── utils/                # Utility condivise
├── config/                   # Configurazioni API (Progetto 17)
├── middleware/               # Middleware API ottimizzati
├── services/                 # Servizi business logic
└── utils/                    # Utility condivise
```

### 🚨 Regole Server Management AGGIORNATE
**COMANDI VIETATI:**
- `pm2 restart` senza autorizzazione
- `kill -9` sui processi server
- Riavvio server senza planning
- **NUOVO**: Modifica configurazioni proxy senza test
- **NUOVO**: Cambio porte server (4001/4003 FISSE)

**COMANDI PERMESSI (Solo Diagnostica):**
- `pm2 status`
- `pm2 logs`
- `curl http://localhost:4001/health`
- `curl http://localhost:4003/health` (NUOVO endpoint)
- `ps aux | grep node`

### 🔧 Ottimizzazioni Implementate (Progetti 16-17)

#### ✅ Proxy Server Ottimizzato (Progetto 16)
- **CORS Centralizzato**: Configurazione unificata per tutti gli endpoint
- **Rate Limiting Modulare**: Con esenzioni per OPTIONS e health checks
- **Middleware Modulari**: Security, logging, body parsing separati
- **Health Check Avanzato**: `/healthz` con controlli multipli
- **Graceful Shutdown**: Gestione unificata SIGTERM/SIGINT
- **Testing Integrato**: Supertest, ESLint, Prettier

#### ✅ API Server Ottimizzato (Progetto 17)
- **Riduzione Codice**: Da 527 a 195 righe (-63%)
- **Architettura Modulare**: ServiceLifecycleManager, MiddlewareManager
- **Performance**: Monitoring condizionale, cache ottimizzata
- **Sicurezza**: Helmet, CSP, rate limiting specifico
- **Validazione**: Input validation centralizzata
- **API Versioning**: Supporto v1/v2 con backward compatibility

#### ✅ Sistema Routing Avanzato (Progetto 19)
- **Routing Centralizzato**: RouterMap unificata con versioning API
- **Legacy Redirects**: Trasparenti (`/login` → `/api/v1/auth/login`)
- **Endpoint Diagnostici**: `/routes`, `/routes/health`, `/routes/stats`
- **Rate Limiting Dinamico**: Configurazione per tipo endpoint
- **CORS Dinamico**: Basato su pattern di route
- **Logging Unificato**: Request ID tracking e audit trail
- **Body Parsing V38**: Risolto problema POST requests
- **Header Automatici**: `x-api-version` aggiunto automaticamente

### 🔑 Credenziali Test Standard
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN

### ⚠️ Problemi Risolti e Prevenzione

#### 🐛 Bug Middleware Performance (Risolto)
- **Problema**: Timeout 5s su tutte le richieste HTTP
- **Causa**: Contesto JavaScript errato nel middleware
- **Soluzione**: Corretto contesto `this` e closure
- **Prevenzione**: Test obbligatori dopo modifiche middleware

#### 🔧 Discrepanza Porte (Risolto)
- **Problema**: Proxy su porta 3000 invece di 4003
- **Causa**: Configurazione non aggiornata
- **Soluzione**: Standardizzazione porte in tutti i file config
- **Prevenzione**: Porte FISSE nelle regole (4001/4003)

#### 🚨 Login 401 Unauthorized (Risolto)
- **Problema**: Frontend non raggiungeva proxy
- **Causa**: Mismatch configurazione porte
- **Soluzione**: Allineamento completo configurazioni
- **Prevenzione**: Test login obbligatorio dopo ogni modifica

#### 🚨 Body Parsing V38 (Risolto - Progetto 19)
- **Problema**: Body delle richieste POST non processato
- **Causa**: Body parser non applicati ai router versionati
- **Soluzione**: Body parser applicati direttamente a v1Router e v2Router
- **Prevenzione**: Test login obbligatorio dopo modifiche routing

#### 🔧 Sistema Routing Avanzato (Implementato - Progetto 19)
- **Problema**: Routing frammentato e non scalabile
- **Causa**: Configurazioni sparse e duplicazioni
- **Soluzione**: Sistema routing centralizzato con RouterMap unificata
- **Caratteristiche**: Versioning API, legacy redirects, diagnostica avanzata
- **Prevenzione**: Test endpoint diagnostici obbligatori

## 📊 Entità del Sistema

### ✅ Entità Obbligatorie
- `Person` - Entità unificata utenti
- `PersonRole` - Sistema ruoli con RoleType enum
- `PersonSession` - Gestione sessioni
- `RefreshToken` - Token di refresh
- `Company` - Gestione aziende
- `Course` - Gestione corsi
- `Document` - Gestione documenti
- `Folder` - Organizzazione documenti
- `GdprAuditLog` - Log audit GDPR
- `ConsentRecord` - Registrazione consensi

### ❌ Entità Obsolete (VIETATE)
- `User` - Sostituito da Person
- `Employee` - Sostituito da Person
- `Role` - Sostituito da PersonRole
- `UserRole` - Sostituito da PersonRole

## 🛡️ Template GDPR Unificato

### Componenti Obbligatori
- `ViewModeToggle` - Cambio vista tabella/card
- `AddEntityDropdown` - Aggiunta nuove entità
- `FilterPanel` - Filtri avanzati
- `ColumnSelector` - Selezione colonne
- `BatchEditButton` - Modifica batch
- `SearchBar` - Ricerca globale
- `ResizableTable` - Tabella ridimensionabile
- `CardGrid` - Vista card responsive
- `ExportButton` - Esportazione dati
- `ImportCSV` - Importazione CSV

### Audit Trail Obbligatorio
```typescript
const AUDIT_ACTIONS = {
  CREATE_PERSON: 'CREATE_PERSON',
  UPDATE_PERSON: 'UPDATE_PERSON',
  DELETE_PERSON: 'DELETE_PERSON',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  EXPORT_DATA: 'EXPORT_DATA',
  IMPORT_DATA: 'IMPORT_DATA'
};
```

## 🔄 Metodologia Rigorosa AGGIORNATA

### Procedura Standard
1. **Analisi Stato di Fatto** - Verificare situazione reale
2. **Planning Dettagliato** - Documentare ogni intervento
3. **Implementazione Graduale** - Procedere step by step
4. **Test Funzionale** - Verificare ogni modifica
5. **Documentazione** - Aggiornare documentazione
6. **Validazione Finale** - Confermare funzionamento
7. **NUOVO**: Test Health Check completo (API + Proxy)
8. **NUOVO**: Verifica configurazioni porte

### 🧪 Test Obbligatori Post-Modifica
```bash
# Test base sempre obbligatori
curl http://localhost:4001/health
curl http://localhost:4003/health

# Test login sempre obbligatorio
curl -X POST http://localhost:4003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}'

# Test CORS se modificato
curl -X OPTIONS http://localhost:4003/api/auth/login \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"

# NUOVO - Test sistema routing avanzato
curl http://localhost:4003/routes/health
curl http://localhost:4003/routes/stats
curl -I http://localhost:4003/login  # Test legacy redirect

# NUOVO - Test versioning API
curl -H "x-api-version: v1" http://localhost:4003/api/v1/health
curl -H "x-api-version: v2" http://localhost:4003/api/v2/health

# NUOVO - Test body parsing V38
curl -X POST http://localhost:4003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"Admin123!"}' \
  -v | grep -E "(200|400|401)"
```

### Checklist Pre-Commit AGGIORNATA
- [ ] **Person entity** utilizzata (NO User/Employee)
- [ ] **deletedAt** per soft delete (NO eliminato/isDeleted)
- [ ] **PersonRole** per ruoli (NO UserRole/Role)
- [ ] **Login testato** con credenziali standard
- [ ] **Nessun file temporaneo** in root/backend
- [ ] **Documentazione aggiornata**
- [ ] **Template GDPR** implementato se necessario
- [ ] **Standard UI rispettati** (pulsanti a pillola, colori azzurri)
- [ ] **Componenti documentati** con regole di utilizzo
- [ ] **NUOVO**: Test health check proxy (`curl http://localhost:4003/health`)
- [ ] **NUOVO**: Verifica porte server (4001/4003)
- [ ] **NUOVO**: Test CORS se modificato
- [ ] **NUOVO**: Validazione rate limiting se modificato

## 📁 Struttura Progetto Corretta

```
/
├── backend/                   # Server API e Proxy
│   ├── auth/                  # Sistema autenticazione
│   ├── controllers/           # Controller business logic
│   ├── services/              # Servizi applicativi
│   ├── utils/                 # Utility condivise
│   └── prisma/                # Schema DB e migrazioni
├── src/                       # Frontend React/Next.js
│   ├── app/                   # Next.js App Router
│   ├── components/
│   │   └── shared/            # Componenti standardizzati
│   ├── services/api/          # Layer API centralizzato
│   ├── hooks/                 # Custom React hooks
│   ├── context/               # Context providers
│   └── types/                 # Definizioni TypeScript
├── docs/                      # Documentazione progetto
│   ├── deployment/            # Guide deployment
│   ├── technical/             # Documentazione tecnica
│   ├── troubleshooting/       # Risoluzione problemi
│   ├── user/                  # Manuali utente
│   └── 10_project_managemnt/  # Planning operativi
└── .trae/rules/               # Regole del progetto
```

## 🚫 Anti-Pattern da Evitare

1. **File temporanei** in root o backend
2. **Entità obsolete** (User, Employee, Role, UserRole)
3. **Campi obsoleti** (eliminato, isDeleted)
4. **Riavvio server** senza autorizzazione
5. **Codice senza test** del login
6. **Documentazione obsoleta** o non corrispondente

## 🎯 Prevenzione Disordine Futuro

### Regole Rigorose
- **File temporanei/test** SOLO in sottocartelle dedicate
- **Planning obbligatorio** per ogni nuovo progetto
- **Verifica pulizia** prima di ogni commit
- **Controllo automatico** con script di pulizia

### Cartelle Dedicate per File Temporanei
- `docs/10_project_managemnt/[progetto]/temp/`
- `docs/10_project_managemnt/[progetto]/test/`
- `docs/10_project_managemnt/[progetto]/debug/`

## 📚 Riferimenti Documentazione

- **Architettura**: `/docs/technical/architecture/`
- **Sviluppo**: `/docs/technical/implementation/`
- **Frontend**: `/docs/technical/`
- **Backend**: `/docs/technical/api/`
- **Planning**: `/docs/10_project_managemnt/`
- **Deployment**: `/docs/deployment/`
- **Regole**: `/.trae/rules/`

---

**Nota**: Questo documento è la fonte di verità per tutte le regole del progetto. Versione corretta e sintetizzata che riflette lo stato reale del sistema.