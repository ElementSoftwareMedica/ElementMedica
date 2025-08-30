# 🚀 Planning Implementazione Users e Roles Avanzato
**Progetto 2.0 - Sistema GDPR Compliant**
*Data: 2025-07-09*

## 🔧 Stato Attuale e Problemi Identificati

### ❌ Problemi Critici Risolti
1. **Errore Sintassi**: Corretto errore `};` extra in `errorHandler.js` riga 125
2. **Server Status**: I server necessitano di riavvio per caricare le correzioni
3. **Endpoint Test**: Configurati correttamente ma non funzionanti per mancato riavvio

### 📋 Requisiti Utente

#### 👥 Pagina Users
- **Visualizzazione**: Tutte le Person ordinate per login più recente
- **Colonne**: Rimuovere checkboxes di default
- **Modifica**: Checkboxes visibili solo quando si preme "Modifica"
- **Pulsanti**: Tutti a pillola (design standard)
- **Dettagli**: Click su riga apre pagina dettagli completa
- **Conformità**: Template GDPR obbligatorio

#### 🔐 Pagina Roles
- **Layout**: Pannello diviso in 2 sezioni
- **Sezione SX**: Gestione ruoli (rinomina, aggiungi, elimina)
- **Sezione DX**: Assegnazione permessi granulari per ruolo
- **Permessi**: Controllo granulare su aziende, corsi, dipendenti
- **Esempio**: Formatore vede solo corsi assegnati e info limitate dipendenti

## 🏗️ Architettura Implementazione

### 📊 Database Schema (Verificare Esistente)
```sql
-- Entità principali (da verificare)
Person (entità unificata)
PersonRole (sistema ruoli)
RoleType (enum ruoli)
Company (aziende)
Course (corsi)
Permission (permessi granulari)
RolePermission (associazioni ruolo-permesso)
Tenant (multi-tenancy)
```

### 🎨 Componenti UI Standard
```typescript
// Componenti GDPR obbligatori
ViewModeToggle
AddEntityDropdown
FilterPanel
ColumnSelector
BatchEditButton
SearchBar
ResizableTable
CardGrid
ExportButton
ImportCSV
```

## 📝 Piano di Implementazione

### Phase 1: Preparazione e Verifica
1. **Verifica Schema DB**: Controllare entità Person, PersonRole, RoleType
2. **Audit Componenti**: Verificare componenti GDPR esistenti
3. **Test Credenziali**: Confermare login admin@example.com / Admin123!
4. **Verifica Ruoli**: Controllare presenza ruolo ADMIN in database

### Phase 2: Pagina Users
1. **Query Ottimizzata**: Person con ultimo login ordinato DESC
2. **Tabella Responsive**: Implementare ResizableTable
3. **Gestione Checkboxes**: Logica condizionale per modalità modifica
4. **Pulsanti Pillola**: Applicare design standard azzurro
5. **Routing Dettagli**: Implementare navigazione a pagina dettagli
6. **GDPR Compliance**: Audit trail per visualizzazioni

### Phase 3: Pagina Roles
1. **Layout Split**: Pannello 50/50 responsive
2. **Gestione Ruoli SX**: CRUD completo RoleType
3. **Permessi Granulari DX**: Sistema permessi avanzato
4. **Associazioni**: RolePermission con controllo tenant
5. **Validazione**: Controlli business logic
6. **Audit**: Tracciamento modifiche permessi

### Phase 4: Sistema Permessi Granulari
1. **Definizione Permessi**: Matrice permessi per risorsa
2. **Controllo Accesso**: Middleware validazione permessi
3. **Filtri Dinamici**: Query condizionali per ruolo
4. **Cache Permessi**: Ottimizzazione performance

## 🔒 Conformità GDPR

### Audit Trail Obbligatorio
```typescript
const AUDIT_ACTIONS = {
  VIEW_USERS: 'VIEW_USERS',
  VIEW_USER_DETAILS: 'VIEW_USER_DETAILS',
  MODIFY_USER: 'MODIFY_USER',
  VIEW_ROLES: 'VIEW_ROLES',
  MODIFY_ROLE: 'MODIFY_ROLE',
  ASSIGN_PERMISSION: 'ASSIGN_PERMISSION',
  REVOKE_PERMISSION: 'REVOKE_PERMISSION'
};
```

### Controlli Privacy
- **Accesso Limitato**: Solo utenti autorizzati
- **Log Accessi**: Tracciamento visualizzazioni
- **Consensi**: Verifica consensi per dati sensibili
- **Anonimizzazione**: Opzioni per dati sensibili

## 🧪 Piano di Test

### Test Funzionali
1. **Login**: Credenziali admin@example.com
2. **Navigazione**: Accesso pagine Users/Roles
3. **Visualizzazione**: Ordinamento e filtri
4. **Modifica**: Modalità edit e permessi
5. **Dettagli**: Navigazione pagina dettagli

### Test Permessi
1. **Ruolo Admin**: Accesso completo
2. **Ruolo Formatore**: Accesso limitato
3. **Filtri Dinamici**: Dati visibili per ruolo
4. **Validazione**: Controlli business logic

## 📁 Struttura File

### Frontend
```
src/
├── app/
│   ├── users/
│   │   ├── page.tsx (lista users)
│   │   └── [id]/
│   │       └── page.tsx (dettagli user)
│   └── roles/
│       └── page.tsx (gestione ruoli)
├── components/
│   ├── users/
│   │   ├── UsersTable.tsx
│   │   ├── UserDetailsModal.tsx
│   │   └── UserEditForm.tsx
│   └── roles/
│       ├── RolesPanel.tsx
│       ├── PermissionsPanel.tsx
│       └── RolePermissionMatrix.tsx
```

### Backend
```
backend/
├── routes/
│   ├── users-routes.js (aggiornare)
│   └── roles.js (estendere)
├── services/
│   ├── userService.js
│   └── permissionService.js
└── middleware/
    └── advanced-permissions.js
```

## 🚨 Note Critiche

### Vincoli Assoluti
- ✅ **SOLO Person** - Entità unificata
- ✅ **SOLO deletedAt** - Soft delete standardizzato
- ✅ **SOLO PersonRole** - Sistema ruoli unificato
- ❌ **VIETATO** riavviare server (gestiti dall'utente)
- ❌ **VIETATO** cambiare porte server
- ✅ **OBBLIGATORIO** Template GDPR
- ✅ **OBBLIGATORIO** Audit trail

### Credenziali Test
- **Email**: admin@example.com
- **Password**: Admin123!
- **Porta Frontend**: 5173 (gestita dall'utente)

## 📊 Metriche Successo

### Funzionalità
- [ ] Login admin funzionante
- [ ] Pagina Users con ordinamento corretto
- [ ] Modalità edit con checkboxes
- [ ] Navigazione dettagli utente
- [ ] Pagina Roles con pannello split
- [ ] Gestione permessi granulari
- [ ] Ruolo ADMIN visibile in settings/roles

### Performance
- [ ] Caricamento pagine < 2s
- [ ] Query ottimizzate
- [ ] Cache permessi attiva

### Conformità
- [ ] Audit trail completo
- [ ] Template GDPR implementato
- [ ] Controlli privacy attivi

---

**Prossimo Step**: Verifica stato database e componenti esistenti prima di iniziare implementazione.