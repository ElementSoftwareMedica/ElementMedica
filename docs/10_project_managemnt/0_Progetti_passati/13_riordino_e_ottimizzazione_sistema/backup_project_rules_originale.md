# 📋 Project Rules - Sistema Unificato Person con GDPR Compliance

**Versione:** 2.1 Ottimizzata  
**Data:** 25 Gennaio 2025  
**Stato:** Sistema Refactorizzato e GDPR-Compliant - Documentazione Sincronizzata

## 🎯 Principi Fondamentali

### 🚫 Regole Assolute

1. **Sistema Person Unificato**: SOLO entità `Person` per tutti gli utenti (NO User, NO Employee)
2. **Soft Delete Standardizzato**: SOLO campo `deletedAt` (NO eliminato, NO isDeleted)
3. **Sistema Ruoli Unificato**: SOLO `PersonRole` con enum `RoleType`
4. **GDPR Compliance Obbligatoria**: Audit trail, consensi, data retention
5. **Ordine e Manutenibilità**: Codice sempre ordinato e manutenibile
6. **Comunicazione Italiana**: Sempre in italiano (eccetto codice e standard internazionali)
7. **Planning Operativo**: Ogni operazione significativa richiede planning in `/docs/10_project_managemnt`
8. **Architettura Tre Server**: API (4001), Documents (4002), Proxy (4003)
9. **Documentazione Aggiornata**: Mantenere `/docs` sempre sincronizzato
10. **🚫 DIVIETO ASSOLUTO RIAVVIO SERVER**: È severamente vietato riavviare, killare o fermare i server senza autorizzazione esplicita del proprietario
11. **🔑 Credenziali Test Standard**: Per test utilizzare SEMPRE: `admin@example.com` / `Admin123!`
12. **🛡️ Massima Attenzione Login**: Prestare estrema attenzione alle modifiche al sistema di autenticazione
13. **📊 Template GDPR Unificato**: Utilizzare esclusivamente `GDPREntityTemplate` per nuove pagine entità
14. **🎨 Componenti UI Standardizzati**: Utilizzare componenti riutilizzabili a forma di pillola
15. **📋 Metodologia Rigorosa**: Procedere sempre con metodo, ordine e rigore assoluto

## 🔒 Entità Sistema Unificato

### ✅ Entità Obbligatorie
1. **`Person`** - Sistema unificato per utenti e dipendenti
2. **`PersonRole`** - Gestione ruoli con RoleType enum (ADMIN, MANAGER, EMPLOYEE, TRAINER)
3. **`PersonSession`** - Sessioni unificate per tracking accessi
4. **`RefreshToken`** - Gestione token di refresh per autenticazione OAuth 2.0
5. **`Company`** - Gestione aziende con template GDPR
6. **`Course`** - Gestione corsi con template GDPR
7. **`Document`** - Gestione documenti con audit trail
8. **`Folder`** - Organizzazione documenti per entità
9. **`GdprAuditLog`** - Audit trail GDPR-compliant automatico
10. **`ConsentRecord`** - Gestione consensi GDPR per Person

### 🚫 Entità Obsolete (SEVERAMENTE VIETATE)
- ~~`User`~~ → **SOSTITUITA** da `Person`
- ~~`Employee`~~ → **SOSTITUITA** da `Person`
- ~~`UserRole`~~ → **SOSTITUITA** da `PersonRole`
- ~~`UserSession`~~ → **SOSTITUITA** da `PersonSession`

## 🚫 Regole Assolute Server Management

### ⚠️ DIVIETO ASSOLUTO - COMANDI VIETATI
- **🚫 NON utilizzare MAI** senza autorizzazione:
  - `pm2 restart/stop/delete/reload/kill`
  - `kill -9 [pid]` / `pkill` / `killall`
  - `sudo systemctl restart/stop/reload`
  - `sudo reboot` / `sudo shutdown`
  - `sudo service [service] restart/stop`

### 🚨 PROCEDURA OBBLIGATORIA PER INTERVENTI SERVER
1. **RICHIEDERE AUTORIZZAZIONE** esplicita al proprietario
2. **SPECIFICARE MOTIVO** dell'intervento
3. **ATTENDERE CONFERMA** prima di procedere
4. **TESTARE** con credenziali standard dopo ogni modifica

### ✅ Comandi Permessi (SOLO Diagnostica)
- `pm2 status` - Controllo stato processi
- `pm2 logs [process]` - Visualizzazione log
- `curl http://localhost:4001/health` - Health check API
- `curl http://localhost:4002/health` - Health check Documents
- `curl http://localhost:4003/health` - Health check Proxy
- `ps aux | grep node` - Controllo processi
- `netstat -tlnp | grep -E ':(4001|4002|4003)'` - Controllo porte

### 🔑 Credenziali Test Obbligatorie
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN (accesso completo sistema)
- **⚠️ DIVIETO ASSOLUTO**: NON modificare senza autorizzazione
- **⚠️ TEST OBBLIGATORIO**: Verificare login dopo ogni modifica

## 🏗️ Architettura Sistema

### Tre Server Obbligatori

#### 1. API Server (Porta 4001) - Core Business Logic
**Responsabilità**:
- Autenticazione OAuth 2.0 + PKCE con JWT e Refresh Token
- Sistema unificato Person
- Business logic per tutte le entità con soft delete (`deletedAt`)
- Gestione ruoli con PersonRole e RoleType enum
- GDPR compliance automatico con audit trail
- Interfaccia con database PostgreSQL

**Endpoint Principali**:
- `/api/auth/*` - Autenticazione OAuth 2.0 + PKCE
- `/api/persons/*` - Gestione persone (sistema unificato)
- `/api/companies/*` - Gestione aziende con template GDPR
- `/api/courses/*` - Gestione corsi con template GDPR
- `/api/gdpr/*` - Compliance GDPR
- `/api/health` - Health check sistema

#### 2. Documents Server (Porta 4002) - File Management
**Responsabilità**:
- Generazione documenti PDF con template GDPR
- Template management per entità unificate
- Storage sicuro documenti con audit trail
- Gestione cartelle organizzate per entità

**Endpoint Principali**:
- `/generate/*` - Generazione documenti con template GDPR
- `/templates/*` - Gestione template unificati
- `/download/*` - Download sicuro con audit
- `/upload/*` - Upload con validazione
- `/health` - Health check documenti

#### 3. Proxy Server (Porta 4003) - Frontend e Routing
**Responsabilità**:
- Serve applicazione React con GDPREntityTemplate
- Routing intelligente tra API e Documents
- Gestione CORS e headers sicurezza
- Rate limiting e throttling
- Caching strategico per performance

**Componenti Frontend Principali**:
- `GDPREntityTemplate` - Template unificato per Companies e Courses
- `ViewModeToggle` - Switch tabella/griglia
- `AddEntityDropdown` - Menu aggiunta entità
- `FilterPanel` - Pannello filtri avanzati
- `ColumnSelector` - Selezione colonne dinamica
- `BatchEditButton` - Azioni multiple GDPR-compliant

### Flusso Comunicazione
```
Client → Proxy (4003) → API Server (4001) ↔ Database
                    → Documents Server (4002)
```

## 📊 Template GDPR Unificato

### 🎯 Utilizzo Obbligatorio
- **UTILIZZARE SEMPRE** `GDPREntityTemplate` per nuove pagine entità
- **BASATO SU** implementazione Companies (riferimento gold standard)
- **INTEGRATO CON** funzionalità Courses complete
- **COMPLIANCE AUTOMATICA** GDPR integrata

### 🧩 Componenti Integrati
- `ViewModeToggle`: Switch tabella/griglia (forma pillola)
- `AddEntityDropdown`: Aggiungi/Importa CSV/Download Template (forma pillola)
- `FilterPanel`: Filtri avanzati (forma pillola)
- `ColumnSelector`: Gestione colonne (forma pillola)
- `BatchEditButton`: Operazioni multiple con checkbox (forma pillola)
- `SearchBar`: Ricerca intelligente
- `ResizableTable`: Tabella responsive con selezione multipla
- `CardGrid`: Vista griglia responsive
- `ExportButton`: Esportazione dati
- `ImportCSV`: Importazione automatica

### 📋 Configurazione Standard
```typescript
const entityConfig = {
  entityName: 'entities',
  apiEndpoint: '/api/entities',
  permissions: {
    view: 'entities.view',
    create: 'entities.create',
    edit: 'entities.edit',
    delete: 'entities.delete',
    export: 'entities.export',
    import: 'entities.import'
  },
  columns: getEntityColumns(),
  cardConfig: getEntityCardConfig(),
  csvTemplate: entityCsvTemplate,
  searchFields: ['name', 'email'],
  batchOperations: true,
  viewModeToggle: true,
  columnSelector: true,
  exportEnabled: true,
  importEnabled: true
};
```

## 🔐 Gestione GDPR

### Audit Trail Obbligatorio
```typescript
const GDPR_TRACKED_ACTIONS = [
  'CREATE_PERSON', 'UPDATE_PERSON', 'DELETE_PERSON',
  'VIEW_PERSONAL_DATA', 'EXPORT_PERSONAL_DATA',
  'LOGIN', 'LOGOUT', 'ROLE_ASSIGNMENT'
];

// Template Audit Log
await prisma.gdprAuditLog.create({
  data: {
    personId: targetPersonId,
    action: 'UPDATE_PERSON',
    dataType: 'PERSONAL_DATA',
    oldData: oldPersonData,
    newData: newPersonData,
    reason: 'User profile update',
    ipAddress: req.ip,
    timestamp: new Date()
  }
});
```

### Gestione Consensi
```typescript
const CONSENT_TYPES = {
  ESSENTIAL: 'ESSENTIAL',
  MARKETING: 'MARKETING',
  ANALYTICS: 'ANALYTICS',
  DATA_PROCESSING: 'DATA_PROCESSING'
};

// Verifica Consenso
const hasConsent = await checkConsent(personId, 'DATA_PROCESSING');
if (!hasConsent) {
  return res.status(403).json({ 
    error: 'Consenso richiesto',
    consentType: 'DATA_PROCESSING'
  });
}
```

### Data Retention
```typescript
const RETENTION_POLICIES = {
  PERSONAL_DATA: 7 * 365,    // 7 anni
  AUDIT_LOGS: 10 * 365,     // 10 anni
  SESSION_DATA: 30,         // 30 giorni
  CONSENT_RECORDS: 7 * 365  // 7 anni
};
```

## 👤 Sistema Unificato Person

### Entità Person Unificata
```typescript
// ✅ CORRETTO - Uso Person unificato
const person = await prisma.person.findUnique({
  where: { id: personId, deletedAt: null },
  include: {
    personRoles: {
      where: { deletedAt: null },
      include: { permissions: true }
    }
  }
});

// ❌ VIETATO - Entità obsolete
const user = await prisma.user.findUnique({ where: { id } });
```

### Soft Delete Standardizzato
```typescript
// ✅ CORRETTO - Solo deletedAt
const softDelete = async (id: string) => {
  return await prisma.person.update({
    where: { id },
    data: { deletedAt: new Date() }
  });
};

// Query con soft delete
const activePersons = await prisma.person.findMany({
  where: { deletedAt: null }
});
```

### Sistema Ruoli Unificato
```typescript
// ✅ CORRETTO - PersonRole con RoleType enum
const assignRole = async (personId: string, roleType: RoleType) => {
  return await prisma.personRole.create({
    data: {
      personId,
      roleType, // ADMIN, MANAGER, EMPLOYEE, TRAINER
      assignedAt: new Date()
    }
  });
};
```

## 🔄 Migrazione e Manutenzione

### Checklist Pre-Implementazione
```typescript
// ✅ VERIFICHE OBBLIGATORIE
// 1. Usa Person invece di User/Employee?
// 2. Usa deletedAt invece di eliminato/isDeleted?
// 3. Usa PersonRole invece di UserRole/Role?
// 4. Include controlli GDPR?
// 5. Gestisce soft delete correttamente?

const createNewFeature = async (personId: string, data: any) => {
  // Verifica Person esiste e non è cancellato
  const person = await prisma.person.findUnique({
    where: { id: personId, deletedAt: null }
  });
  
  if (!person) {
    throw new Error('Person non trovato o cancellato');
  }
  
  // Verifica permessi con PersonRole
  const hasPermission = await prisma.personRole.findFirst({
    where: {
      personId,
      deletedAt: null,
      roleType: { in: ['ADMIN', 'MANAGER'] }
    }
  });
  
  if (!hasPermission) {
    throw new Error('Permessi insufficienti');
  }
  
  // Implementa con soft delete
  return await prisma.newEntity.create({
    data: {
      ...data,
      personId,
      createdAt: new Date(),
      deletedAt: null
    }
  });
};
```

## 🚨 Anti-Pattern da Evitare

### 🚫 Regole Assolute Anti-Pattern
1. **NON utilizzare any in TypeScript** senza giustificazione
2. **NON creare componenti monolitici** oltre 200 righe
3. **NON implementare logica business** nei componenti UI
4. **NON ignorare gestione errori** nelle chiamate API
5. **NON hardcodare valori** di configurazione
6. **NON utilizzare entità obsolete** (User, Employee, Role, UserRole)
7. **NON utilizzare campi obsoleti** (eliminato, isDeleted)
8. **NON implementare** senza verificare Person entity
9. **NON ignorare soft delete** con deletedAt

## ✅ Checklist di Verifica

### Prima del Commit
- [ ] **SOLO Person entity utilizzata** (NO User, NO Employee)
- [ ] **SOLO deletedAt per soft delete** (NO eliminato, NO isDeleted)
- [ ] **SOLO PersonRole + RoleType** (NO UserRole, NO Role)
- [ ] **Controlli GDPR con Person unificato**
- [ ] **Login testato** con credenziali standard
- [ ] **Documentazione aggiornata**
- [ ] **Conformità GDPR verificata**
- [ ] **Pattern architetturali rispettati**

### Prima del Deploy
- [ ] Server su porte corrette (4001, 4002, 4003)
- [ ] Proxy routing funzionante
- [ ] Autenticazione OAuth operativa
- [ ] Database migrazioni applicate
- [ ] Backup configurato
- [ ] Monitoring attivo

## 📚 Struttura Progetto

```
/
├── backend/                   # Server API, Documents, Proxy
│   ├── auth/                  # Sistema autenticazione OAuth 2.0
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

## 📚 Documentazione e Manutenzione

### 🔄 Aggiornamento Documentazione - PROCEDURA OBBLIGATORIA
- **ANALIZZARE SEMPRE** stato di fatto del sistema prima di documentare
- **VERIFICARE CORRISPONDENZA** tra documentazione e realtà
- **AGGIORNARE SOLO** quando si è certi della corrispondenza
- **MANTENERE SEMPRE** sincronizzata con il codice
- **INCLUDERE ESEMPI** pratici e funzionanti
- **VERIFICARE ACCURATEZZA** prima del commit

### 📋 Metodologia Rigorosa - PROCEDURA STANDARD
1. **ANALISI STATO FATTO**: Verificare situazione reale del sistema
2. **CONFRONTO DOCUMENTAZIONE**: Identificare discrepanze
3. **AGGIORNAMENTO GRADUALE**: Procedere sezione per sezione
4. **VERIFICA FUNZIONALE**: Testare ogni procedura documentata
5. **VALIDAZIONE FINALE**: Confermare corrispondenza completa
6. **COMMIT DOCUMENTATO**: Descrivere modifiche effettuate

### 🚨 Checklist Pre-Commit OBBLIGATORIA
- [ ] **CODICE TESTATO** con credenziali standard
- [ ] **LOGIN VERIFICATO** funzionante dopo ogni modifica
- [ ] **DOCUMENTAZIONE AGGIORNATA** e corrispondente allo stato di fatto
- [ ] **NESSUN SERVER** riavviato senza autorizzazione
- [ ] **TEMPLATE GDPR** implementato correttamente
- [ ] **REGOLE PROGETTO** rispettate integralmente

### 🔒 Controlli Critici Finali
- **SISTEMA LOGIN**: Funzionante al 100% con credenziali standard
- **SERVER STATUS**: Nessuna interruzione o riavvio non autorizzato
- **TEMPLATE GDPR**: Completo di tutte le funzionalità integrate
- **DOCUMENTAZIONE**: Riflette esattamente lo stato reale del sistema

## 📚 Riferimenti Documentazione

- **Architettura**: `/docs/technical/architecture/`
- **Sviluppo**: `/docs/technical/implementation/`
- **Frontend**: `/docs/technical/`
- **Backend**: `/docs/technical/api/`
- **Planning**: `/docs/10_project_managemnt/`
- **Deployment**: `/docs/deployment/`
- **Regole**: `/.trae/rules/`

---

**Nota**: Questo documento è la fonte di verità per tutte le regole del progetto. In caso di conflitto con altre documentazioni, questo documento ha precedenza.