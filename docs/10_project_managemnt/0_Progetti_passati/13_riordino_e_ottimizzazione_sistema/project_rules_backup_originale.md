# 📋 Project Rules - Sistema Unificato Person con GDPR Compliance

**Versione:** 2.0 Post-Refactoring  
**Data:** 25 Gennaio 2025  
**Stato:** Sistema Completamente Refactorizzato e GDPR-Compliant con Template Unificato

## 🎯 Principi Fondamentali

### 🚫 Regole Assolute

1. **Sistema Person Unificato**: SOLO entità `Person` per tutti gli utenti (NO User, NO Employee)
2. **Soft Delete Standardizzato**: SOLO campo `deletedAt` (NO eliminato, NO isDeleted)
3. **Sistema Ruoli Unificato**: SOLO `PersonRole` con enum `RoleType`
4. **GDPR Compliance Obbligatoria**: Audit trail, consensi, data retention
5. **Ordine e Manutenibilità**: Codice sempre ordinato e manutenibile
6. **No Mock Data**: Mai dati fittizi in produzione
7. **Comunicazione Italiana**: Sempre in italiano (eccetto codice e standard internazionali)
8. **Planning Operativo**: Ogni operazione significativa richiede planning in `/docs/10_project_managemnt`
9. **Architettura Tre Server**: API (4001), Documents (4002), Proxy (4003)
10. **Documentazione Aggiornata**: Mantenere `/docs` sempre sincronizzato
11. **🚫 DIVIETO ASSOLUTO RIAVVIO SERVER**: È severamente vietato riavviare, killare o fermare i server. Solo il proprietario del progetto può gestire i server. Se necessario un riavvio, DEVE essere richiesto esplicitamente.
12. **🚫 DIVIETO ASSOLUTO GESTIONE SERVER**: È severamente vietato utilizzare comandi come `pm2 restart`, `pm2 stop`, `pm2 delete`, `kill`, `pkill`, `systemctl restart` o qualsiasi comando che possa interrompere i servizi server senza autorizzazione esplicita del proprietario.
13. **🔑 Credenziali Test Standard - OBBLIGATORIE**: Per test di login utilizzare SEMPRE: email `admin@example.com` e password `Admin123!`. Queste credenziali sono le UNICHE autorizzate per testing e sviluppo. **TESTARE OBBLIGATORIAMENTE** ogni modifica al login con queste credenziali. **NON modificare MAI** queste credenziali senza autorizzazione esplicita. **VERIFICARE SEMPRE** che il login funzioni prima di considerare completato qualsiasi lavoro. **PRESTARE MASSIMA ATTENZIONE** a modifiche che possono compromettere l'autenticazione.
14. **🛡️ Massima Attenzione Login - PROTEZIONE CRITICA**: Prestare estrema attenzione quando si interviene su funzionalità che possono compromettere il sistema di autenticazione e login. Ogni modifica al sistema di autenticazione deve essere testata con le credenziali standard prima del deployment. **VERIFICARE SEMPRE** che il login funzioni prima di considerare completato qualsiasi lavoro. In caso di problemi di login, **NON procedere** senza aver ripristinato la funzionalità.
15. **📊 Template GDPR Unificato**: Utilizzare esclusivamente `GDPREntityTemplate` per tutte le nuove implementazioni di pagine entità. Il template è basato sulla pagina Companies e garantisce compliance GDPR automatica.
16. **🎨 Componenti UI Standardizzati**: Utilizzare sempre componenti UI riutilizzabili a forma di pillola: `ViewModeToggle`, `AddEntityDropdown`, `FilterPanel`, `ColumnSelector`, `BatchEditButton` per garantire consistenza nell'interfaccia utente.
17. **🔄 Template Courses Integrato**: Il template GDPR include tutte le funzionalità della pagina Courses: toggle tabella/griglia, dropdown per aggiunta/import CSV, pulsanti filtra/colonne/modifica con checkbox per selezione multipla.

## 📊 Template GDPR Unificato - Sistema Completo

### 🎯 Utilizzo Obbligatorio
- **UTILIZZARE SEMPRE** `GDPREntityTemplate` per nuove pagine entità
- **BASATO SU** implementazione Companies (riferimento gold standard)
- **INTEGRATO CON** funzionalità Courses complete
- **COMPLIANCE AUTOMATICA** GDPR integrata
- **COMPONENTI STANDARDIZZATI** per consistenza UI
- **FUNZIONALITÀ COMPLETE** pronte all'uso

### 🧩 Componenti Integrati (Completi)
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

### 🔄 Funzionalità Courses Integrate
- **Toggle Tabella/Griglia**: Visualizzazione dinamica
- **Dropdown Aggiunta**: Singola entità, Import CSV, Download Template
- **Riga Controlli**: Filtra, Colonne, Modifica (con checkbox)
- **Selezione Multipla**: Checkbox per azioni batch
- **Import/Export CSV**: Gestione automatica file
- **Permessi Dinamici**: Basati su ruolo utente

### 📋 Configurazione Standard Completa
```typescript
// Configurazione completa con tutte le funzionalità
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
  csvHeaders: entityCsvHeaders,
  searchFields: ['name', 'email'],
  filterOptions: entityFilterOptions,
  sortOptions: entitySortOptions,
  batchOperations: true,
  viewModeToggle: true,
  columnSelector: true,
  exportEnabled: true,
  importEnabled: true
};
```

### 🎨 UI Standardizzata
- **Forma Pillola**: Tutti i pulsanti e controlli
- **Layout Responsive**: Adattivo a tutti i dispositivi
- **Consistenza Visiva**: Stile unificato in tutto il sistema
- **Accessibilità**: Conforme agli standard WCAG
- **Performance**: Ottimizzato per grandi dataset
18. **📋 Metodologia Rigorosa**: Procedere sempre con metodo, ordine e rigore assoluto. Aggiornare documentazione e regole solo quando corrispondono allo stato di fatto del progetto reale.
19. **🔒 Protezione Sistema Critico**: Ogni intervento su funzionalità critiche (autenticazione, server, database) richiede autorizzazione preventiva e testing con credenziali standard.
20. **📚 Sincronizzazione Documentazione**: La documentazione in `/docs` deve sempre riflettere lo stato reale del sistema per favorire future implementazioni rispettando GDPR e regole.

## 🔒 Entità Assolute Sistema Unificato (Post-Refactoring)

### ✅ Entità Obbligatorie (Sistema Unificato Person)
1. **`Person`** - Sistema unificato per utenti e dipendenti (sostituisce User ed Employee)
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
- ~~`User`~~ → **SOSTITUITA** da `Person` (DIVIETO ASSOLUTO di utilizzo)
- ~~`Employee`~~ → **SOSTITUITA** da `Person` (DIVIETO ASSOLUTO di utilizzo)
- ~~`UserRole`~~ → **SOSTITUITA** da `PersonRole` (DIVIETO ASSOLUTO di utilizzo)
- ~~`UserSession`~~ → **SOSTITUITA** da `PersonSession` (DIVIETO ASSOLUTO di utilizzo)
- Qualsiasi riferimento a entità obsolete nel codice è **SEVERAMENTE VIETATO**

## 🚫 Regole Assolute Server Management

### ⚠️ DIVIETO ASSOLUTO - SEVERAMENTE VIETATO SENZA AUTORIZZAZIONE ESPLICITA
- **🚫 NON riavviare MAI** server senza autorizzazione esplicita del proprietario
- **🚫 NON killare MAI** processi server senza autorizzazione esplicita del proprietario
- **🚫 NON fermare MAI** servizi senza autorizzazione esplicita del proprietario
- **🚫 NON utilizzare MAI** comandi PM2 di controllo senza autorizzazione:
  - `pm2 restart [any-process]`
  - `pm2 stop [any-process]`
  - `pm2 delete [any-process]`
  - `pm2 reload [any-process]`
  - `pm2 kill`
- **🚫 NON utilizzare MAI** comandi di sistema senza autorizzazione:
  - `kill -9 [any-pid]`
  - `pkill [any-process]`
  - `killall [any-process]`
  - `sudo systemctl restart [any-service]`
  - `sudo systemctl stop [any-service]`
  - `sudo systemctl reload [any-service]`
  - `sudo reboot`
  - `sudo shutdown`
  - `sudo service [any-service] restart`
  - `sudo service [any-service] stop`
- **🚫 NON modificare MAI** configurazioni server senza autorizzazione
- **🚫 NON interrompere MAI** servizi in produzione (PostgreSQL, Nginx, Redis, PM2)
- **🚫 NON modificare MAI** il sistema di autenticazione senza autorizzazione
- **🚫 NON toccare MAI** file di configurazione critici (ecosystem.config.js, .env, nginx.conf)
- **🚫 NON modificare MAI** porte dei server (4001, 4002, 4003, 5432)

### 🚨 PROCEDURA OBBLIGATORIA PER INTERVENTI SERVER
1. **RICHIEDERE AUTORIZZAZIONE** esplicita al proprietario del progetto
2. **SPECIFICARE MOTIVO** dell'intervento richiesto
3. **ATTENDERE CONFERMA** prima di procedere
4. **UTILIZZARE SOLO** comandi autorizzati dal proprietario
5. **DOCUMENTARE** ogni intervento effettuato
6. **TESTARE** con credenziali standard dopo ogni modifica

### ✅ Comandi Permessi (SOLO Diagnostica)
- `pm2 status` - Controllo stato processi
- `pm2 logs [process-name]` - Visualizzazione log specifici
- `pm2 monit` - Monitoring risorse in tempo reale
- `curl http://localhost:4001/health` - Health check API Server
- `curl http://localhost:4002/health` - Health check Documents Server
- `curl http://localhost:4003/health` - Health check Proxy Server
- `ps aux | grep node` - Controllo processi Node.js
- `netstat -tlnp | grep -E ':(4001|4002|4003)'` - Controllo porte
- `top -n 1` - Controllo risorse sistema
- `df -h` - Controllo spazio disco
- `free -m` - Controllo memoria

### 🔑 Credenziali Test Obbligatorie (CRITICHE)
- **Email**: `admin@example.com`
- **Password**: `Admin123!`
- **Ruolo**: ADMIN (accesso completo sistema)
- **Permessi**: Gestione completa Person, Company, Course, Documents
- **Utilizzo**: ESCLUSIVAMENTE per testing e sviluppo
- **⚠️ DIVIETO ASSOLUTO**: NON modificare queste credenziali senza autorizzazione esplicita
- **⚠️ ATTENZIONE MASSIMA**: Ogni modifica al sistema di autenticazione DEVE essere testata con queste credenziali
- **⚠️ AUTORIZZAZIONE OBBLIGATORIA**: Ogni intervento sul sistema di login deve essere autorizzato preventivamente

## 🏗️ Architettura Sistema

### 🚫 Regole Assolute Architettura
- **NON modificare porte** dei server
- **NON bypassare proxy** per comunicazioni
- **NON alterare responsabilità** dei server
- **NON ignorare separazione** dei concern

### 🚫 Regole Assolute Gestione Server
- **🚫 DIVIETO ASSOLUTO**: NON riavviare, killare, fermare o interrompere i server
- **🚫 DIVIETO ASSOLUTO**: NON utilizzare comandi come `pm2 restart`, `pm2 stop`, `pm2 delete`, `kill`, `pkill`, `systemctl restart`, `sudo reboot`
- **🚫 DIVIETO ASSOLUTO**: NON modificare configurazioni di processo dei server senza autorizzazione
- **🚫 DIVIETO ASSOLUTO**: NON interrompere servizi critici (PostgreSQL, Nginx, PM2) senza autorizzazione
- **✅ OBBLIGATORIO**: Richiedere esplicitamente al proprietario per qualsiasi intervento sui server
- **✅ OBBLIGATORIO**: Utilizzare solo le credenziali test standard: `admin@example.com` / `Admin123!`
- **✅ OBBLIGATORIO**: Testare sempre le modifiche al sistema di autenticazione con le credenziali standard
- **⚠️ ATTENZIONE MASSIMA**: Estrema cautela per modifiche al sistema di autenticazione
- **⚠️ ATTENZIONE MASSIMA**: Ogni modifica che può compromettere il login deve essere pre-approvata

### 📊 Template GDPR Unificato (Regole Implementazione)
- **✅ OBBLIGATORIO**: Utilizzare `GDPREntityTemplate` per tutte le nuove pagine entità
- **✅ OBBLIGATORIO**: Basare implementazioni sul pattern della pagina Companies
- **✅ OBBLIGATORIO**: Includere tutti i componenti UI standardizzati: toggle view, dropdown azioni, pulsanti filtro/colonne/modifica
- **✅ OBBLIGATORIO**: Implementare sistema permessi granulare per ogni entità
- **✅ OBBLIGATORIO**: Garantire compliance GDPR automatica con audit trail
- **🚫 DIVIETO ASSOLUTO**: NON creare pagine entità senza utilizzare il template unificato
- **🚫 DIVIETO ASSOLUTO**: NON implementare componenti UI custom quando esistono componenti riutilizzabili
- **⚠️ ATTENZIONE**: Ogni nuova implementazione deve rispettare l'organizzazione e l'ordine del progetto

### Tre Server Obbligatori (Sistema Unificato Person)

#### 1. API Server (Porta 4001) - Core Business Logic
**Responsabilità**:
- Autenticazione OAuth 2.0 + PKCE con JWT e Refresh Token
- Sistema unificato Person (sostituisce User ed Employee)
- Business logic per tutte le entità con soft delete (`deletedAt`)
- Gestione ruoli con PersonRole e RoleType enum
- GDPR compliance automatico con audit trail
- Interfaccia con database PostgreSQL
- Logging operazioni e audit trail GDPR-compliant

**Endpoint Principali**:
- `/api/auth/*` - Autenticazione OAuth 2.0 + PKCE
- `/api/persons/*` - Gestione persone (sistema unificato)
- `/api/companies/*` - Gestione aziende con template GDPR
- `/api/courses/*` - Gestione corsi con template GDPR
- `/api/schedules/*` - Gestione pianificazioni
- `/api/gdpr/*` - Compliance GDPR (export, delete, audit)
- `/api/admin/*` - Funzioni amministrative
- `/api/health` - Health check sistema

#### 2. Documents Server (Porta 4002) - File Management
**Responsabilità**:
- Generazione documenti PDF con template GDPR
- Template management per entità unificate
- Storage sicuro documenti con audit trail
- Conversione formati e validazione
- Ottimizzazione file e backup automatico
- Gestione cartelle organizzate per entità

**Endpoint Principali**:
- `/generate/*` - Generazione documenti con template GDPR
- `/templates/*` - Gestione template unificati
- `/download/*` - Download sicuro con audit
- `/upload/*` - Upload con validazione
- `/folders/*` - Gestione cartelle organizzate
- `/health` - Health check documenti

#### 3. Proxy Server (Porta 4003) - Frontend e Routing
**Responsabilità**:
- Serve applicazione React con GDPREntityTemplate
- Routing intelligente tra API e Documents
- Gestione CORS e headers sicurezza
- Rate limiting e throttling
- Load balancing interno con health checks
- Caching strategico per performance
- Interfaccia unificata per gestione entità

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

## 🔐 Gestione Autorizzazione e Accesso

### 🚫 Regole Assolute Sicurezza
- **NON loggare dati personali** in plain text
- **NON bypassare controlli** autorizzazione
- **NON hardcodare credenziali** nel codice
- **NON ignorare validazione** input utente
- **NON esporre informazioni** sensibili in errori
- **SOLO Person entity** per gestione utenti (NO User, NO Employee)
- **SOLO deletedAt** per soft delete (NO eliminato, NO isDeleted)
- **SOLO PersonRole** per ruoli (NO UserRole, NO Role separato)

## 🔐 Regole GDPR Specifiche

### Audit Trail Obbligatorio

#### Operazioni che DEVONO essere tracciate:
```typescript
// SEMPRE tracciare queste operazioni
const GDPR_TRACKED_ACTIONS = [
  'CREATE_PERSON',
  'UPDATE_PERSON',
  'DELETE_PERSON',
  'VIEW_PERSONAL_DATA',
  'EXPORT_PERSONAL_DATA',
  'ANONYMIZE_PERSON',
  'GRANT_CONSENT',
  'REVOKE_CONSENT',
  'LOGIN',
  'LOGOUT',
  'PASSWORD_CHANGE',
  'ROLE_ASSIGNMENT',
  'ROLE_REVOCATION'
];
```

#### Template Audit Log:
```typescript
// OBBLIGATORIO per ogni operazione sui dati personali
await prisma.gdprAuditLog.create({
  data: {
    personId: targetPersonId,
    action: 'UPDATE_PERSON',
    dataType: 'PERSONAL_DATA',
    oldData: oldPersonData,
    newData: newPersonData,
    reason: 'User profile update',
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  }
});
```

### Gestione Consensi

#### Tipi di Consenso Richiesti:
```typescript
const CONSENT_TYPES = {
  ESSENTIAL: 'ESSENTIAL',           // Sempre richiesto
  MARKETING: 'MARKETING',           // Opzionale
  ANALYTICS: 'ANALYTICS',           // Opzionale
  PROFILING: 'PROFILING',          // Opzionale
  THIRD_PARTY: 'THIRD_PARTY',      // Opzionale
  DATA_PROCESSING: 'DATA_PROCESSING' // Richiesto per processing
};
```

#### Verifica Consenso Obbligatoria:
```typescript
// SEMPRE verificare consenso prima del processing
const hasConsent = await checkConsent(personId, 'DATA_PROCESSING');
if (!hasConsent) {
  return res.status(403).json({ 
    error: 'Consenso richiesto',
    consentType: 'DATA_PROCESSING',
    message: 'È necessario il consenso per il processing dei dati.'
  });
}
```

### Data Retention

#### Politiche di Conservazione:
```typescript
const RETENTION_POLICIES = {
  PERSONAL_DATA: 7 * 365, // 7 anni (2555 giorni)
  AUDIT_LOGS: 10 * 365,   // 10 anni (3650 giorni)
  SESSION_DATA: 30,       // 30 giorni
  CONSENT_RECORDS: 7 * 365, // 7 anni
  MARKETING_DATA: 2 * 365   // 2 anni
};
```

#### Calcolo Data Retention:
```typescript
// OBBLIGATORIO impostare dataRetentionUntil
const dataRetentionUntil = new Date();
dataRetentionUntil.setDate(dataRetentionUntil.getDate() + RETENTION_POLICIES.PERSONAL_DATA);

await prisma.person.update({
  where: { id: personId },
  data: { dataRetentionUntil }
});
```

### Sistema Autenticazione

#### OAuth 2.0 + PKCE
```typescript
// ✅ Flusso autenticazione corretto
const authConfig = {
  clientId: process.env.OAUTH_CLIENT_ID,
  redirectUri: process.env.OAUTH_REDIRECT_URI,
  scope: 'openid profile email',
  responseType: 'code',
  codeChallenge: generatePKCEChallenge(),
  codeChallengeMethod: 'S256'
};
```

#### Gestione Sessioni
- **JWT tokens** per autenticazione
- **Refresh tokens** per rinnovo automatico
- **Session timeout** configurabile
- **Logout sicuro** con invalidazione token

#### Controlli Autorizzazione
```typescript
// ✅ Middleware autorizzazione
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// ✅ Controllo ruoli
const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accesso negato' });
    }
    next();
  };
};
```

## 👤 SISTEMA UNIFICATO POST-REFACTORING

### 🚫 Regole Assolute Sistema Unificato
- **SOLO Person entity** - User ed Employee ELIMINATI
- **SOLO deletedAt** - eliminato e isDeleted ELIMINATI
- **SOLO PersonRole + RoleType enum** - Role e UserRole ELIMINATI
- **NON utilizzare entità obsolete** in nuovo codice
- **Migrazione completa** prima di nuove funzionalità

### Entità Person Unificata
```typescript
// ✅ CORRETTO - Uso Person unificato
const person = await prisma.person.findUnique({
  where: { id: personId, deletedAt: null },
  include: {
    personRoles: {
      where: { deletedAt: null },
      include: { permissions: true }
    },
    refreshTokens: true
  }
});

// ❌ VIETATO - Entità obsolete
const user = await prisma.user.findUnique({ where: { id } });
const employee = await prisma.employee.findUnique({ where: { id } });
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

// ✅ CORRETTO - Query con soft delete
const activePersons = await prisma.person.findMany({
  where: { deletedAt: null }
});

// ❌ VIETATO - Campi obsoleti
const deleted = await prisma.person.update({
  where: { id },
  data: { eliminato: true } // CAMPO NON ESISTE PIÙ
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

// ✅ CORRETTO - Verifica permessi
const hasPermission = async (personId: string, permission: string) => {
  const personRole = await prisma.personRole.findFirst({
    where: {
      personId,
      deletedAt: null
    },
    include: { permissions: true }
  });
  
  return personRole?.permissions.some(p => p.name === permission) || false;
};

// ❌ VIETATO - Entità obsolete
const userRole = await prisma.userRole.findFirst({ where: { userId } });
const role = await prisma.role.findUnique({ where: { id } });
```

### Pattern GDPR Compliant
```typescript
// ✅ CORRETTO - Export dati Person
const exportPersonData = async (personId: string) => {
  const person = await prisma.person.findUnique({
    where: { id: personId, deletedAt: null },
    include: {
      personRoles: { where: { deletedAt: null } },
      courseEnrollments: { where: { deletedAt: null } },
      refreshTokens: true,
      activityLogs: true
    }
  });
  
  return {
    personalData: {
      id: person.id,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      createdAt: person.createdAt
    },
    roles: person.personRoles,
    enrollments: person.courseEnrollments,
    loginHistory: person.refreshTokens.map(t => ({
      loginAt: t.createdAt,
      deviceInfo: t.deviceInfo
    }))
  };
};

// ✅ CORRETTO - Cancellazione GDPR
const gdprDelete = async (personId: string) => {
  // Soft delete Person e tutte le relazioni
  await prisma.$transaction([
    prisma.person.update({
      where: { id: personId },
      data: { deletedAt: new Date() }
    }),
    prisma.personRole.updateMany({
      where: { personId },
      data: { deletedAt: new Date() }
    }),
    prisma.courseEnrollment.updateMany({
      where: { personId },
      data: { deletedAt: new Date() }
    })
  ]);
};
```

### Conformità GDPR

#### Regole Assolute GDPR
- **Controllo consenso** prima di processare dati
- **Minimizzazione dati** - solo necessari
- **Diritto cancellazione** implementato
- **Portabilità dati** garantita
- **Notifica breach** entro 72h
- **Person unificato** per tracciabilità completa

#### Pattern GDPR-Compliant (Sistema Unificato Person)

#### Soft Delete Obbligatorio con Audit Trail
```typescript
// ✅ CORRETTO - Soft delete con audit automatico
const deletePerson = async (id: string, deletedBy: string) => {
  const result = await Person.update(
    { 
      deletedAt: new Date(),
      deletedBy: deletedBy
    },
    { where: { id, deletedAt: null } }
  );
  
  // Audit trail automatico
  await GdprAuditLog.create({
    entityType: 'Person',
    entityId: id,
    action: 'DELETE',
    performedBy: deletedBy,
    timestamp: new Date()
  });
  
  return result;
};

// ❌ SEVERAMENTE VIETATO - Hard delete
const deletePerson = async (id: string) => {
  await Person.destroy({ where: { id } }); // DIVIETO ASSOLUTO!
};
```

#### Export GDPR Person Completo
```typescript
// ✅ CORRETTO - Export completo con template GDPR
const exportPersonData = async (personId: string) => {
  const person = await Person.findOne({
    where: { id: personId, deletedAt: null },
    include: [
      { model: PersonRole, include: [{ model: RoleType }] },
      { model: PersonSession },
      { model: RefreshToken },
      { model: GdprAuditLog },
      { model: ConsentRecord },
      { model: Company, through: { where: { deletedAt: null } } },
      { model: Course, through: { where: { deletedAt: null } } }
    ]
  });
  
  return {
    personalData: {
      id: person.id,
      email: person.email,
      firstName: person.firstName,
      lastName: person.lastName,
      roles: person.PersonRoles,
      companies: person.Companies,
      courses: person.Courses
    },
    auditTrail: person.GdprAuditLogs,
    consents: person.ConsentRecords,
    sessions: person.PersonSessions,
    exportDate: new Date().toISOString(),
    exportFormat: 'GDPR_COMPLIANT_JSON'
  };
};
```

#### Template GDPR per Frontend
```typescript
// ✅ CORRETTO - Utilizzo GDPREntityTemplate
const PersonPage = () => {
  return (
    <GDPREntityTemplate
      entityName="persons"
      apiEndpoint="/api/persons"
      columns={getPersonColumns()}
      permissions={{
        canCreate: hasPermission('PERSON_CREATE'),
        canEdit: hasPermission('PERSON_EDIT'),
        canDelete: hasPermission('PERSON_DELETE'),
        canExport: hasPermission('GDPR_EXPORT')
      }}
      gdprCompliant={true}
      auditTrail={true}
    />
  );
};

// ❌ VIETATO - Template non GDPR-compliant
const PersonPage = () => {
  return <BasicTable data={persons} />; // VIETATO!
};
```

#### Pattern Corretti
```typescript
// ✅ Logging GDPR-compliant
logger.info('Person autenticato', { 
  personId: person.id, // OK - identificatore
  action: 'login',
  timestamp: new Date().toISOString()
  // NON loggare email, nome, dati personali
});

// ✅ Gestione consenso
const processPersonalData = async (personId: string, data: any) => {
  const consent = await checkPersonConsent(personId, 'data_processing');
  if (!consent.granted) {
    throw new Error('Consenso richiesto per processare dati');
  }
  // Processa dati solo se consenso valido
};
```

## 🛠️ Stack Tecnologico

### 🚫 Regole Assolute Stack
- **Solo ES Modules** (no CommonJS)
- **Solo Tailwind CSS** (no CSS custom)
- **TypeScript obbligatorio** (no JavaScript)
- **Next.js 14+** per frontend
- **Node.js LTS** per backend
- **PostgreSQL** come database

### Tecnologie Approvate

#### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Custom Hooks
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Fetch API nativo
- **Testing**: Jest + React Testing Library

#### Backend
- **Runtime**: Node.js LTS
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT + OAuth 2.0
- **Validation**: Zod
- **Testing**: Jest + Supertest

### Pattern di Sviluppo

#### 1. Container/Presentational Pattern
```typescript
// ✅ Container Component
const EmployeeListContainer: React.FC = () => {
  const { employees, loading, error } = useEmployees();
  
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <EmployeeList employees={employees} />;
};

// ✅ Presentational Component
const EmployeeList: React.FC<{ employees: Employee[] }> = ({ employees }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {employees.map(employee => (
      <EmployeeCard key={employee.id} employee={employee} />
    ))}
  </div>
);
```

#### 2. Factory Pattern per Servizi API
```typescript
// ✅ API Service Factory
class ApiServiceFactory {
  static createEmployeeService(): EmployeeService {
    return new EmployeeServiceAdapter({
      baseUrl: process.env.NEXT_PUBLIC_API_URL,
      timeout: 10000
    });
  }
}
```

#### 3. Custom Hooks Pattern
```typescript
// ✅ Custom Hook
const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEmployees();
  }, []);
  
  return { employees, loading, error };
};
```

## 🗣️ Comunicazione Obbligatoria

### 🚫 Regole Assolute
- **SEMPRE in italiano**: Documentazione, commenti, commit, issue, planning
- **Eccezioni**: Codice sorgente, librerie esterne, standard internazionali

### Esempi
```typescript
// ✅ Corretto
const fetchUserData = async (userId: string) => {
  // Recupera i dati dell'utente dal database
  return await userService.getById(userId);
};

// ❌ Sbagliato
const fetchUserData = async (userId: string) => {
  // Fetch user data from database
  return await userService.getById(userId);
};
```

## 📋 Planning Operativo Obbligatorio

### 🚫 Regole Assolute
- **SEMPRE planning** per operazioni significative
- **NON implementare** senza planning approvato
- **Struttura obbligatoria** in `/docs/10_project_managemnt/`

### Struttura File
```
N_nome_operazione/
├── ANALISI_PROBLEMA.md      # Analisi dettagliata
├── PLANNING_DETTAGLIATO.md  # Piano implementazione
├── IMPLEMENTAZIONE.md       # Documentazione sviluppo
└── RISULTATI.md             # Risultati e metriche
```

### Operazioni che Richiedono Planning
- Nuove funzionalità
- Modifiche architetturali
- Integrazioni esterne
- Refactoring maggiori
- Aggiornamenti dipendenze critiche
- Modifiche database/schema
- Security updates

## 📚 Aggiornamento Documentazione Obbligatorio

### 🚫 Regole Assolute
- **SEMPRE aggiornare** contestualmente alle modifiche
- **NON deploy** senza documentazione sincronizzata
- **Aggiornamento nello stesso commit**

### Mapping Modifiche → Documentazione
| Tipo Modifica | Documentazione |
|---------------|----------------|
| API Changes | `/docs/6_BACKEND/api-reference.md` |
| UI Components | `/docs/5_FRONTEND/components.md` |
| Database Schema | `/docs/6_BACKEND/database-schema.md` |
| Deployment | `/docs/4_DEPLOYMENT/` |
| Architecture | `/docs/2_ARCHITECTURE/` |
| User Features | `/docs/1_USER/user-guide.md` |

### Checklist
- [ ] File rilevanti aggiornati
- [ ] Esempi di codice verificati
- [ ] Link e riferimenti controllati
- [ ] Date e versioni aggiornate

## 🧩 Componenti Riutilizzabili Obbligatori

### 🚫 Regole Assolute
- **NON duplicare** componenti esistenti
- **NON modificare shared** senza analisi impatto
- **Solo Tailwind CSS** per styling
- **Accessibilità obbligatoria** (WCAG 2.1 AA)
- **Props tipizzate** TypeScript
- **Mobile-first responsive**

### Gerarchia
```
src/components/
├── shared/ui/          # Button, Input, Modal, Card, Table
├── shared/layout/      # Header, Sidebar, Footer, Container
├── shared/forms/       # FormField, FormGroup, FormValidation
├── business/           # employee/, document/, auth/
└── pages/              # dashboard/, employees/, documents/
```

### Standard Componenti
```typescript
// ✅ Props tipizzate
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// ✅ Solo Tailwind CSS
const Button: React.FC<ButtonProps> = ({ variant, size, children }) => {
  const baseClasses = 'font-medium rounded-md focus:outline-none focus:ring-2';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300'
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`}>
      {children}
    </button>
  );
};
```

## 🎨 Standard Design Moderno ed Elegante

### 🚫 Regole Assolute
- **SEMPRE design system** definito
- **Solo colori approvati**
- **Layout responsive** obbligatorio
- **Accessibilità WCAG 2.1 AA**
- **Spacing standardizzato**
- **Font approvati**

### Palette Colori
```css
/* Primari */
--primary-500: #3b82f6;  /* Principale */
--primary-600: #2563eb;  /* Hover */
--primary-700: #1d4ed8;  /* Active */

/* Neutri */
--gray-50: #f9fafb;      /* Sfondo pagina */
--gray-100: #f3f4f6;     /* Sfondo card */
--gray-500: #6b7280;     /* Testo secondario */
--gray-900: #111827;     /* Testo principale */

/* Stato */
--success-500: #10b981;  /* Successo */
--warning-500: #f59e0b;  /* Attenzione */
--error-500: #ef4444;    /* Errore */
```

### Typography
```css
/* Headings */
.heading-1 { @apply text-4xl font-bold; }    /* 36px */
.heading-2 { @apply text-3xl font-semibold; } /* 30px */
.heading-3 { @apply text-2xl font-semibold; } /* 24px */

/* Body */
.text-base { @apply text-base leading-normal; }   /* 16px */
.text-small { @apply text-sm leading-normal; }    /* 14px */
```

### Spacing (basato su 4px)
```css
--space-2: 0.5rem;   /* 8px  */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
```

```tsx
// ✅ Corretto
const Card = () => (
  <div className="p-6 mb-4 space-y-4">
    <h3 className="mb-2">Titolo</h3>
    <p className="mb-4">Contenuto</p>
  </div>
);
```

### Componenti UI Standard
```tsx
// Button
const Button: React.FC<ButtonProps> = ({ variant, children, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 transition-colors duration-200';
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300'
  };
  return (
    <button className={`${baseClasses} ${variants[variant]}`} {...props}>
      {children}
    </button>
  );
};

// Card
const Card: React.FC<CardProps> = ({ children }) => (
  <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
    {children}
  </div>
);
```

### Animazioni
```css
/* Durate */
--duration-fast: 150ms;     /* Hover, focus */
--duration-normal: 200ms;   /* Standard */
--duration-slow: 300ms;     /* Modal */
```

```tsx
// ✅ Esempi approvati
const HoverCard = () => (
  <div className="transition-all duration-200 hover:shadow-lg">
    Content
  </div>
);

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
);
```

### Accessibilità (WCAG 2.1 AA)
- **Contrasto**: Testo normale 4.5:1, UI 3:1
- **Focus states**: `focus:outline-none focus:ring-2 focus:ring-primary-500`
- **Keyboard navigation**: Tab order logico, Escape per modal

### Responsive Mobile-First
```css
/* Breakpoints */
sm: 640px, md: 768px, lg: 1024px, xl: 1280px
```

```tsx
// ✅ Pattern responsive
const ResponsiveGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {items.map(item => <Card key={item.id} {...item} />)}
  </div>
);
```

### Checklist Design
- [ ] Colori approvati
- [ ] Spacing standardizzato
- [ ] Focus states implementati
- [ ] Responsive testato
- [ ] Accessibilità verificata
- [ ] Performance controllata

## 📁 Struttura del Progetto

### 🚫 Regole Assolute Struttura
- **NON modificare struttura principale** delle directory
- **NON alterare organizzazione** componenti condivisi
- **NON spostare file configurazione** principali
- **NON modificare struttura backend** (tre server)

### Organizzazione Directory
```
project/
├── backend/                    # Backend Node.js
│   ├── src/
│   │   ├── api/               # API Server (4001)
│   │   ├── documents/         # Documents Server (4002)
│   │   └── proxy/             # Proxy Server (4003)
│   └── prisma/                # Schema DB e migrazioni
├── src/                       # Frontend React/Next.js
│   ├── app/                   # Next.js App Router
│   ├── components/
│   │   └── shared/            # Componenti standardizzati
│   ├── services/api/          # Layer API centralizzato
│   ├── hooks/                 # Custom React hooks
│   ├── context/               # Context providers
│   └── types/                 # Definizioni TypeScript
├── docs_new/                  # Documentazione progetto
│   └── 10_NEW_PROJECTS/       # Planning operativi
└── .trae/rules/               # Regole del progetto
```

## 🏷️ Convenzioni di Nomenclatura

### 🚫 Regole Assolute Nomenclatura
- **NON utilizzare nomi generici** (es. "utils.ts", "helpers.ts")
- **NON mixare convenzioni** nello stesso contesto
- **NON omettere prefissi standard** ("use" per hook, "handle" per eventi)

### Convenzioni per Tipo
| Tipo | Convenzione | Esempio |
|------|-------------|----------|
| Componenti React | `PascalCase.tsx` | `EmployeeForm.tsx` |
| Hook personalizzati | `useNomeHook.ts` | `useEmployees.ts` |
| Servizi API | `nomeServiceAdapter.ts` | `employeeServiceAdapter.ts` |
| Utility | `camelCase.ts` | `dateUtils.ts` |
| Test | `NomeFile.test.tsx` | `Button.test.tsx` |

### Prefissi Semantici
| Prefisso | Uso | Esempio |
|----------|-----|----------|
| `is`, `has`, `should` | Boolean | `isActive`, `hasPermission` |
| `on` | Event props | `onClick`, `onSubmit` |
| `handle` | Event handlers | `handleSubmit` |
| `get` | Retrieval methods | `getEmployees` |
| `use` | Custom hooks | `useAuth` |

## 🔄 MIGRAZIONE E MANUTENZIONE SISTEMA UNIFICATO

### 🚫 Regole Assolute Migrazione
- **NON utilizzare entità obsolete** (User, Employee, Role, UserRole)
- **NON utilizzare campi obsoleti** (eliminato, isDeleted)
- **NON bypassare validazione** schema unificato
- **SEMPRE verificare** compatibilità con Person entity
- **SEMPRE utilizzare** deletedAt per soft delete
- **SEMPRE utilizzare** PersonRole + RoleType enum

### Checklist Pre-Implementazione Nuove Funzionalità
```typescript
// ✅ VERIFICHE OBBLIGATORIE
// 1. Usa Person invece di User/Employee?
// 2. Usa deletedAt invece di eliminato/isDeleted?
// 3. Usa PersonRole invece di UserRole/Role?
// 4. Include controlli GDPR?
// 5. Gestisce soft delete correttamente?

// ✅ ESEMPIO IMPLEMENTAZIONE CORRETTA
const createNewFeature = async (personId: string, data: any) => {
  // 1. Verifica Person esiste e non è cancellato
  const person = await prisma.person.findUnique({
    where: { id: personId, deletedAt: null }
  });
  
  if (!person) {
    throw new Error('Person non trovato o cancellato');
  }
  
  // 2. Verifica permessi con PersonRole
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
  
  // 3. Implementa funzionalità con soft delete
  return await prisma.newEntity.create({
    data: {
      ...data,
      personId,
      createdAt: new Date(),
      deletedAt: null // Sempre inizializzare
    }
  });
};
```

### Pattern di Ricerca Unificati
```typescript
// ✅ CORRETTO - Pattern ricerca Person
const searchPersons = async (filters: PersonFilters) => {
  return await prisma.person.findMany({
    where: {
      deletedAt: null, // SEMPRE includere
      ...(filters.email && { email: { contains: filters.email } }),
      ...(filters.role && {
        personRoles: {
          some: {
            roleType: filters.role,
            deletedAt: null
          }
        }
      })
    },
    include: {
      personRoles: {
        where: { deletedAt: null }
      }
    }
  });
};

// ✅ CORRETTO - Pattern conteggi
const getPersonStats = async () => {
  const [total, active, byRole] = await Promise.all([
    prisma.person.count({ where: { deletedAt: null } }),
    prisma.person.count({
      where: {
        deletedAt: null,
        lastLogin: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.personRole.groupBy({
      by: ['roleType'],
      where: { deletedAt: null },
      _count: { personId: true }
    })
  ]);
  
  return { total, active, byRole };
};
```

### Gestione Errori Sistema Unificato
```typescript
// ✅ CORRETTO - Gestione errori specifica
class PersonNotFoundError extends Error {
  constructor(personId: string) {
    super(`Person ${personId} non trovato o cancellato`);
    this.name = 'PersonNotFoundError';
  }
}

class InsufficientPermissionsError extends Error {
  constructor(requiredRole: RoleType) {
    super(`Ruolo ${requiredRole} richiesto`);
    this.name = 'InsufficientPermissionsError';
  }
}

// ✅ CORRETTO - Middleware validazione
const validatePersonExists = async (req: Request, res: Response, next: NextFunction) => {
  const personId = req.params.personId || req.user?.id;
  
  if (!personId) {
    return res.status(400).json({ error: 'Person ID richiesto' });
  }
  
  const person = await prisma.person.findUnique({
    where: { id: personId, deletedAt: null }
  });
  
  if (!person) {
    return res.status(404).json({ error: 'Person non trovato' });
  }
  
  req.person = person;
  next();
};
```

## 🚨 Anti-Pattern da Evitare

### 🚫 Regole Assolute Anti-Pattern
1. **NON utilizzare any in TypeScript** senza giustificazione documentata
2. **NON creare componenti monolitici** oltre 200 righe
3. **NON implementare logica business** nei componenti UI
4. **NON utilizzare useEffect** per data fetching semplice
5. **NON ignorare gestione errori** nelle chiamate API
6. **NON hardcodare valori** di configurazione
7. **NON utilizzare inline styles** invece di Tailwind
8. **NON creare hook** che violano le regole React
9. **NON bypassare validazione** input utente
10. **NON loggare dati sensibili** in plain text
11. **NON utilizzare entità obsolete** (User, Employee, Role, UserRole)
12. **NON utilizzare campi obsoleti** (eliminato, isDeleted)
13. **NON implementare** senza verificare Person entity
14. **NON ignorare soft delete** con deletedAt

## ✅ Checklist di Verifica

### Prima del Commit
- [ ] Codice segue convenzioni nomenclatura
- [ ] Nessun dato sensibile in plain text
- [ ] Gestione errori implementata
- [ ] TypeScript senza errori
- [ ] Test passano
- [ ] Documentazione aggiornata
- [ ] Conformità GDPR verificata
- [ ] Pattern architetturali rispettati
- [ ] **SOLO Person entity utilizzata** (NO User, NO Employee)
- [ ] **SOLO deletedAt per soft delete** (NO eliminato, NO isDeleted)
- [ ] **SOLO PersonRole + RoleType** (NO UserRole, NO Role)
- [ ] **Controlli GDPR con Person unificato**
- [ ] **Validazione schema unificato**

### Prima del Deploy
- [ ] Server su porte corrette (4001, 4002, 4003)
- [ ] Proxy routing funzionante
- [ ] Autenticazione OAuth operativa
- [ ] Database migrazioni applicate
- [ ] Backup configurato
- [ ] Monitoring attivo
- [ ] Logs configurati correttamente

## 📚 Documentazione e Manutenzione - Metodologia Rigorosa

### 📖 Struttura Documentazione Completa
```
/docs
├── deployment/          # Guide deployment e configurazione server
├── technical/           # Documentazione tecnica dettagliata
├── troubleshooting/     # Risoluzione problemi comuni
└── user/               # Manuali utente e guide operative
```

### 🔄 Aggiornamento Documentazione - PROCEDURA OBBLIGATORIA
- **ANALIZZARE SEMPRE** stato di fatto del sistema prima di documentare
- **VERIFICARE CORRISPONDENZA** tra documentazione e realtà
- **AGGIORNARE SOLO** quando si è certi della corrispondenza
- **MANTENERE SEMPRE** sincronizzata con il codice
- **AGGIORNARE IMMEDIATAMENTE** dopo modifiche significative
- **INCLUDERE ESEMPI** pratici e funzionanti
- **VERIFICARE ACCURATEZZA** prima del commit
- **TESTARE PROCEDURE** descritte nella documentazione

### 📋 Metodologia Rigorosa - PROCEDURA STANDARD
1. **ANALISI STATO FATTO**: Verificare situazione reale del sistema
2. **CONFRONTO DOCUMENTAZIONE**: Identificare discrepanze
3. **AGGIORNAMENTO GRADUALE**: Procedere sezione per sezione
4. **VERIFICA FUNZIONALE**: Testare ogni procedura documentata
5. **VALIDAZIONE FINALE**: Confermare corrispondenza completa
6. **COMMIT DOCUMENTATO**: Descrivere modifiche effettuate

### 🚨 Checklist Pre-Commit OBBLIGATORIA
- [ ] **CODICE TESTATO** con credenziali standard (`admin@example.com` / `Admin123!`)
- [ ] **LOGIN VERIFICATO** funzionante dopo ogni modifica
- [ ] **DOCUMENTAZIONE AGGIORNATA** e corrispondente allo stato di fatto
- [ ] **NESSUN SERVER** riavviato senza autorizzazione
- [ ] **COMPONENTI UI** standardizzati utilizzati (forma pillola)
- [ ] **TEMPLATE GDPR** implementato correttamente
- [ ] **PERMESSI GDPR** verificati e funzionanti
- [ ] **FUNZIONALITÀ COURSES** integrate nel template
- [ ] **PERFORMANCE** ottimizzate
- [ ] **SICUREZZA** verificata
- [ ] **REGOLE PROGETTO** rispettate integralmente

### 🔒 Controlli Critici Finali
- **SISTEMA LOGIN**: Funzionante al 100% con credenziali standard
- **SERVER STATUS**: Nessuna interruzione o riavvio non autorizzato
- **TEMPLATE GDPR**: Completo di tutte le funzionalità integrate
- **DOCUMENTAZIONE**: Riflette esattamente lo stato reale del sistema

## 📚 Riferimenti Documentazione

- **Architettura**: `/docs_new/2_ARCHITECTURE/`
- **Sviluppo**: `/docs_new/3_DEVELOPMENT/`
- **Frontend**: `/docs_new/5_FRONTEND/`
- **Backend**: `/docs_new/6_BACKEND/`
- **Planning**: `/docs_new/10_NEW_PROJECTS/`
- **Regole**: `/.trae/rules/`

---

**Nota**: Questo documento è la fonte di verità per tutte le regole del progetto. In caso di conflitto con altre documentazioni, questo documento ha precedenza.