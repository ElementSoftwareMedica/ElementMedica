# 📋 PLANNING DETTAGLIATO - Sistema Users e Roles Avanzato

## 📊 Panoramica Progetto

**Obiettivo**: Implementare un sistema avanzato di gestione Users e Roles con funzionalità granulari, ordinamento per ultimo login, generazione automatica credenziali e gestione permessi multi-tenant.

**Data Inizio**: Gennaio 2025  
**Responsabile**: Assistant AI  
**Metodologia**: Approccio sistematico con risoluzione errori prioritaria

## 🎯 Obiettivi Specifici

### 1. Sistema Users Avanzato
- ✅ **Ordinamento per Ultimo Login**: Visualizzazione Person ordinate per lastLoginAt (più recente → meno recente)
- ✅ **Generazione Username Automatica**: nome.cognome con numerazione progressiva per omonimie
- ✅ **Password Default**: "Password123!" per nuovi utenti
- ✅ **Visualizzazione Completa**: Tutti i dati Person con ruoli associati
- ✅ **Gestione GDPR**: Conformità completa privacy e audit trail

### 2. Sistema Roles Granulare
- ✅ **Pannello Diviso**: Sezione sinistra (gestione ruoli) + sezione destra (permessi)
- ✅ **Gestione Ruoli**: Rinomina, aggiungi, elimina ruoli
- ✅ **Permessi Granulari**: Assegnazione dettagliata per ogni ruolo
- ✅ **Multi-Tenant**: Controllo accesso per azienda/tenant specifico
- ✅ **Controllo Granulare**: Limitazione campi visibili (es. residenza dipendenti)

### 3. Risoluzione Errori Critici
- 🚨 **Errore 404 /api/roles**: Endpoint mancante o mal configurato
- 🚨 **Admin Non Visibile**: Utente admin non appare in settings/users
- 🚨 **Ruoli Non Visibili**: Ruoli esistenti non appaiono in settings/roles

## 🔍 ANALISI STATO ATTUALE

### Problemi Identificati

#### 1. **Errore API 404 /api/roles**
```
POST http://localhost:5173/api/roles 404 (Not Found)
```
**Causa**: Il frontend sta chiamando `/api/roles` ma il backend ha endpoint diversi
**Soluzione**: Verificare routing e allineare frontend/backend

#### 2. **Admin Non Visibile in Users**
**Causa**: Possibili problemi di:
- Filtri di visualizzazione
- Query database Person
- Permessi di accesso
**Soluzione**: Verificare query e filtri

#### 3. **Ruoli Non Visibili**
**Causa**: Endpoint `/api/roles` non funzionante
**Soluzione**: Implementare/correggere endpoint

### Struttura Attuale Identificata

#### Backend Routes Esistenti
- ✅ `/backend/routes/roles.js` - Sistema ruoli avanzato
- ✅ `/backend/routes/users-routes.js` - Gestione utenti
- ✅ `/backend/routes/person-routes.js` - Gestione Person
- ✅ `/backend/routes/settings-routes.js` - Impostazioni sistema

#### Frontend Components
- ✅ `src/pages/settings/UsersTab.tsx` - Pagina utenti
- ✅ `src/pages/settings/RolesTab.tsx` - Pagina ruoli
- ✅ `src/services/api.ts` - Layer API

## 🏗️ FASE 1: RISOLUZIONE ERRORI CRITICI

### 1.1 Analisi Routing API

**Durata**: 0.5 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Mappatura completa endpoint

**Attività**:
- [ ] Verificare configurazione proxy-server.js
- [ ] Analizzare api-server.js per routing
- [ ] Identificare endpoint /api/roles effettivo
- [ ] Verificare middleware autenticazione
- [ ] Testare endpoint con credenziali admin

**Output**:
- Documentazione endpoint corretti
- Identificazione problemi routing
- Piano correzione API

### 1.2 Correzione Endpoint Roles

**Durata**: 0.5 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Endpoint /api/roles funzionante

**Attività**:
- [ ] Correggere routing /api/roles
- [ ] Implementare CRUD completo ruoli
- [ ] Aggiungere validazione richieste
- [ ] Testare con frontend
- [ ] Verificare permessi accesso

**Output**:
- Endpoint /api/roles operativo
- CRUD ruoli funzionante
- Test superati

### 1.3 Verifica Visibilità Admin

**Durata**: 0.5 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Admin visibile in users

**Attività**:
- [ ] Verificare query Person in UsersTab
- [ ] Controllare filtri applicati
- [ ] Verificare permessi visualizzazione
- [ ] Testare con credenziali admin
- [ ] Correggere eventuali problemi

**Output**:
- Admin visibile in lista utenti
- Query Person ottimizzata
- Filtri corretti

## 🏗️ FASE 2: SISTEMA USERS AVANZATO

### 2.1 Ordinamento per Ultimo Login

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: Lista utenti ordinata per lastLoginAt

**Attività**:
- [ ] Modificare query Person per includere lastLoginAt
- [ ] Implementare ordinamento DESC per ultimo login
- [ ] Aggiungere fallback per utenti mai loggati
- [ ] Ottimizzare performance query
- [ ] Aggiornare frontend per visualizzazione

**Struttura Query**:
```javascript
const persons = await prisma.person.findMany({
  include: {
    personRoles: {
      include: { roleType: true }
    },
    personSessions: {
      orderBy: { createdAt: 'desc' },
      take: 1
    }
  },
  orderBy: [
    { lastLoginAt: 'desc' },
    { createdAt: 'desc' }
  ]
});
```

### 2.2 Generazione Username Automatica

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: Sistema generazione username

**Attività**:
- [ ] Implementare funzione generateUsername()
- [ ] Gestire omonimie con numerazione
- [ ] Validare unicità username
- [ ] Integrare in creazione Person
- [ ] Testare con casi edge

**Algoritmo Username**:
```javascript
function generateUsername(firstName, lastName) {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  let username = base;
  let counter = 1;
  
  while (await usernameExists(username)) {
    username = `${base}${counter}`;
    counter++;
  }
  
  return username;
}
```

### 2.3 Password Default e Sicurezza

**Durata**: 0.5 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Sistema password default sicuro

**Attività**:
- [ ] Implementare password default "Password123!"
- [ ] Aggiungere flag requirePasswordChange
- [ ] Implementare notifica cambio password
- [ ] Aggiungere audit trail creazione
- [ ] Testare sicurezza implementazione

**Output**:
- Password default sicura
- Forzatura cambio al primo login
- Audit trail completo

## 🏗️ FASE 3: SISTEMA ROLES GRANULARE

### 3.1 Interfaccia Pannello Diviso

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: UI pannello roles diviso

**Attività**:
- [ ] Ridisegnare RolesTab.tsx con layout diviso
- [ ] Sezione sinistra: lista ruoli con azioni
- [ ] Sezione destra: permessi granulari
- [ ] Implementare selezione ruolo
- [ ] Aggiungere componenti UI moderni

**Layout Target**:
```
┌─────────────────┬─────────────────────────────┐
│ RUOLI           │ PERMESSI RUOLO SELEZIONATO  │
│                 │                             │
│ □ Admin         │ ┌─ Aziende ─────────────┐   │
│ □ Manager       │ │ ☑ Visualizza tutte    │   │
│ □ Employee      │ │ ☑ Crea nuove          │   │
│ □ Trainer       │ │ ☐ Elimina             │   │
│                 │ └───────────────────────┘   │
│ [+ Nuovo Ruolo] │                             │
│                 │ ┌─ Dipendenti ──────────┐   │
│                 │ │ ☑ Visualizza base     │   │
│                 │ │ ☐ Visualizza residenza│   │
│                 │ │ ☐ Modifica dati       │   │
│                 │ └───────────────────────┘   │
└─────────────────┴─────────────────────────────┘
```

### 3.2 Gestione CRUD Ruoli

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: CRUD completo ruoli

**Attività**:
- [ ] Implementare creazione nuovo ruolo
- [ ] Implementare rinomina ruolo
- [ ] Implementare eliminazione ruolo
- [ ] Aggiungere validazioni business
- [ ] Gestire ruoli di sistema (non eliminabili)

**Validazioni Business**:
- Non eliminare ruoli con utenti attivi
- Non modificare ruoli di sistema (ADMIN, SYSTEM)
- Validare nomi ruoli unici
- Controllo permessi per operazioni

### 3.3 Sistema Permessi Granulari

**Durata**: 2 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Sistema permessi completo

**Attività**:
- [ ] Definire struttura permessi granulari
- [ ] Implementare controllo per entità
- [ ] Aggiungere controllo per campi specifici
- [ ] Implementare controllo multi-tenant
- [ ] Creare interfaccia assegnazione permessi

**Struttura Permessi**:
```typescript
interface GranularPermission {
  entity: 'companies' | 'employees' | 'courses' | 'documents';
  action: 'read' | 'create' | 'update' | 'delete';
  scope: 'all' | 'own_company' | 'assigned_only';
  fields?: string[]; // Campi specifici accessibili
  conditions?: PermissionCondition[];
}

interface PermissionCondition {
  field: string;
  operator: 'equals' | 'in' | 'not_in';
  value: any;
}
```

**Esempi Permessi Granulari**:
```javascript
// Trainer: può vedere solo corsi assegnati
{
  entity: 'courses',
  action: 'read',
  scope: 'assigned_only',
  conditions: [{
    field: 'trainerId',
    operator: 'equals',
    value: '{{user.id}}'
  }]
}

// Trainer: può vedere dipendenti dei suoi corsi (senza residenza)
{
  entity: 'employees',
  action: 'read',
  scope: 'assigned_only',
  fields: ['firstName', 'lastName', 'email', 'phone'],
  conditions: [{
    field: 'courseEnrollments.course.trainerId',
    operator: 'equals',
    value: '{{user.id}}'
  }]
}
```

## 🏗️ FASE 4: INTEGRAZIONE E TESTING

### 4.1 Integrazione Frontend-Backend

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: Sistema integrato funzionante

**Attività**:
- [ ] Aggiornare servizi API frontend
- [ ] Implementare chiamate per nuovi endpoint
- [ ] Gestire stati loading e errori
- [ ] Implementare notifiche utente
- [ ] Testare flussi completi

### 4.2 Testing Completo Sistema

**Durata**: 1 giorno  
**Responsabile**: AI Assistant  
**Deliverable**: Sistema testato e validato

**Attività**:
- [ ] Test creazione utenti con username auto
- [ ] Test ordinamento per ultimo login
- [ ] Test gestione ruoli e permessi
- [ ] Test permessi granulari
- [ ] Test conformità GDPR

**Test Cases**:
```javascript
// Test 1: Creazione utente con username automatico
const newUser = {
  firstName: 'Mario',
  lastName: 'Rossi'
};
// Expected: username = 'mario.rossi' o 'mario.rossi1' se esiste

// Test 2: Ordinamento ultimo login
// Expected: utenti ordinati per lastLoginAt DESC

// Test 3: Permessi granulari trainer
// Expected: trainer vede solo suoi corsi e dipendenti limitati
```

### 4.3 Validazione GDPR

**Durata**: 0.5 giorni  
**Responsabile**: AI Assistant  
**Deliverable**: Conformità GDPR verificata

**Attività**:
- [ ] Verificare audit trail completo
- [ ] Testare controlli accesso
- [ ] Validare minimizzazione dati
- [ ] Verificare diritto cancellazione
- [ ] Documentare conformità

## 📊 STATO AVANZAMENTO

### Fase 1: Risoluzione Errori ⏸️ DA INIZIARE
- [ ] Analisi routing API
- [ ] Correzione endpoint roles
- [ ] Verifica visibilità admin

### Fase 2: Sistema Users ⏸️ DA INIZIARE
- [ ] Ordinamento ultimo login
- [ ] Generazione username automatica
- [ ] Password default sicura

### Fase 3: Sistema Roles ⏸️ DA INIZIARE
- [ ] Interfaccia pannello diviso
- [ ] CRUD ruoli completo
- [ ] Permessi granulari

### Fase 4: Integrazione ⏸️ DA INIZIARE
- [ ] Integrazione frontend-backend
- [ ] Testing completo
- [ ] Validazione GDPR

## 🚨 REGOLE CRITICHE

### Server Management
⚠️ **DIVIETO ASSOLUTO**: Non riavviare server senza autorizzazione
- Server gestiti esclusivamente dal proprietario
- Frontend deve rimanere su porta 5173
- Non modificare configurazioni server

### Credenziali Test
🔑 **Credenziali Autorizzate**:
- Email: admin@example.com
- Password: Admin123!
- Utilizzare SOLO per test e sviluppo

### Conformità GDPR
🛡️ **Obbligatorio**:
- Audit trail per ogni operazione
- Controllo accesso granulare
- Minimizzazione dati
- Privacy by design

## 📈 METRICHE DI SUCCESSO

### Funzionalità Users
- [ ] Ordinamento per ultimo login funzionante
- [ ] Username automatico generato correttamente
- [ ] Password default assegnata
- [ ] Admin visibile in lista utenti

### Funzionalità Roles
- [ ] Pannello diviso implementato
- [ ] CRUD ruoli funzionante
- [ ] Permessi granulari operativi
- [ ] Controllo multi-tenant attivo

### Risoluzione Errori
- [ ] Errore 404 /api/roles risolto
- [ ] Tutti gli endpoint API funzionanti
- [ ] Frontend-backend sincronizzati

### Conformità
- [ ] GDPR compliance al 100%
- [ ] Audit trail completo
- [ ] Sicurezza validata

## 🔄 PROSSIMI STEP IMMEDIATI

### Priorità 1 (Critica)
1. **Analizzare errore 404 /api/roles**
2. **Verificare routing backend**
3. **Testare endpoint con credenziali admin**

### Priorità 2 (Alta)
1. **Correggere visibilità admin in users**
2. **Implementare ordinamento ultimo login**
3. **Creare sistema username automatico**

### Priorità 3 (Media)
1. **Implementare pannello roles diviso**
2. **Creare sistema permessi granulari**
3. **Integrare controllo multi-tenant**

---

**Note Importanti**:
- Ogni fase deve essere completata prima di procedere
- Testing continuo durante implementazione
- Documentazione aggiornata in tempo reale
- Backup automatici prima di modifiche critiche
- Rispetto assoluto regole server management

**Ultimo Aggiornamento**: Gennaio 2025  
**Prossimo Milestone**: Risoluzione Errori Critici  
**Status**: 🚨 Errori da Risolvere | ⏸️ Implementazione in Attesa