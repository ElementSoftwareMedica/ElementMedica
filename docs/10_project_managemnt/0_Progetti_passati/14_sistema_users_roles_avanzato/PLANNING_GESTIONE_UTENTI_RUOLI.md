# 📋 PLANNING DETTAGLIATO - Gestione Utenti e Ruoli Avanzata

## 🎯 OBIETTIVI PRINCIPALI

### 1. Sistema Utenti Avanzato
- **Ordinamento**: Visualizzare tutte le `Person` ordinate per data di login più recente
- **Username automatico**: Generazione automatica `nome.cognome` con numerazione per omonimie
- **Password di default**: Assegnazione automatica password "Password123!" per nuove Person

### 2. Sistema Ruoli con Permessi Granulari
- **Pannello diviso**: Sezione sinistra per gestione ruoli, destra per permessi
- **Gestione ruoli**: Rinomina, aggiungi, elimina ruoli
- **Permessi granulari**: Assegnazione permessi e tenant specifici per ogni ruolo
- **Controllo accesso**: Limitazione accesso dati sensibili (es. formatore con accesso limitato)

## 🔧 STATO ATTUALE E PROBLEMI RISOLTI

### ✅ Problemi Risolti
1. **Errore 404 /api/roles**: Aggiunto header `X-Tenant-ID: default-company` nel client API
2. **Middleware tenant**: Configurato per riconoscere il tenant di default in localhost
3. **Utente admin**: Verificata esistenza di `admin@example.com` nel database

### 🔍 Verifiche Necessarie
- [ ] Test endpoint `/api/roles` con nuovo header
- [ ] Verifica visibilità utente admin in `/settings/users`
- [ ] Verifica visibilità ruoli in `/settings/roles`

## 📊 ANALISI TECNICA

### Database Schema Attuale
```sql
-- Tabella Person (utenti unificati)
model Person {
  id                 String              @id @default(uuid())
  firstName          String              @db.VarChar(100)
  lastName           String              @db.VarChar(100)
  email              String              @unique @db.VarChar(255)
  username           String?             @unique @db.VarChar(100)
  password           String?             @db.VarChar(255)
  lastLoginAt        DateTime?           // Campo per ordinamento
  status             PersonStatus        @default(ACTIVE)
  companyId          String?
  personRoles        PersonRole[]
  // ... altri campi
}

-- Tabella PersonRole (ruoli utente)
model PersonRole {
  id         String   @id @default(uuid())
  personId   String
  roleType   RoleType // ADMIN, MANAGER, TRAINER, EMPLOYEE
  companyId  String?
  tenantId   String?
  isActive   Boolean  @default(true)
  // ... altri campi
}
```

### Enum RoleType Attuale
```typescript
enum RoleType {
  ADMIN
  MANAGER
  TRAINER
  EMPLOYEE
}
```

## 🚀 PIANO DI IMPLEMENTAZIONE

### FASE 1: Risoluzione Problemi Critici ⏱️ 30 min

#### 1.1 Test e Verifica API Roles
- [ ] Testare endpoint `/api/roles` con nuovo header X-Tenant-ID
- [ ] Verificare risposta corretta con lista ruoli
- [ ] Controllare log per confermare risoluzione 404

#### 1.2 Verifica Visibilità Dati
- [ ] Controllare pagina `/settings/users` per visibilità admin
- [ ] Controllare pagina `/settings/roles` per visibilità ruoli
- [ ] Verificare caricamento corretto dei dati

### FASE 2: Sistema Utenti Avanzato ⏱️ 2 ore

#### 2.1 Ordinamento per Ultimo Login
```typescript
// Backend: Aggiornare query in UsersService
const users = await prisma.person.findMany({
  where: { companyId: tenantId },
  orderBy: {
    lastLoginAt: 'desc' // Più recente prima
  },
  include: {
    personRoles: true,
    company: true
  }
});
```

#### 2.2 Generazione Username Automatica
```typescript
// Funzione per generare username unico
function generateUsername(firstName: string, lastName: string): Promise<string> {
  const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  // Controlla esistenza e aggiunge numero se necessario
  // es: mario.rossi, mario.rossi1, mario.rossi2, etc.
}
```

#### 2.3 Password di Default
```typescript
// Assegnazione automatica password
const defaultPassword = 'Password123!';
const hashedPassword = await bcrypt.hash(defaultPassword, 12);
```

#### 2.4 Aggiornamento lastLoginAt
```typescript
// Nel middleware di autenticazione
await prisma.person.update({
  where: { id: userId },
  data: { lastLoginAt: new Date() }
});
```

### FASE 3: Sistema Ruoli con Permessi Granulari ⏱️ 3 ore

#### 3.1 Estensione Schema Database
```sql
-- Nuova tabella per permessi granulari
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type VARCHAR(50) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  scope VARCHAR(50) DEFAULT 'global', -- global, tenant, company
  tenant_ids JSONB DEFAULT '[]',
  field_restrictions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(role_type, permission_key)
);
```

#### 3.2 Sistema Permessi Granulari
```typescript
interface Permission {
  key: string; // es: 'employees.read', 'courses.manage'
  scope: 'global' | 'tenant' | 'company';
  tenantIds?: string[]; // Specifici tenant se scope = 'tenant'
  fieldRestrictions?: {
    [fieldName: string]: boolean; // true = visibile, false = nascosto
  };
}

// Esempio permessi per ruolo TRAINER
const trainerPermissions: Permission[] = [
  {
    key: 'courses.read',
    scope: 'tenant',
    tenantIds: ['tenant1', 'tenant2']
  },
  {
    key: 'employees.read',
    scope: 'company',
    fieldRestrictions: {
      'residenza': false, // Campo nascosto
      'stipendio': false,
      'nome': true,
      'email': true
    }
  }
];
```

#### 3.3 UI Pannello Ruoli Diviso
```typescript
// Componente RolesManagement
interface RolesManagementProps {
  // Layout diviso in due sezioni
}

// Sezione Sinistra: Lista Ruoli
- Lista ruoli esistenti
- Pulsanti: Rinomina, Aggiungi, Elimina
- Selezione ruolo attivo

// Sezione Destra: Permessi Granulari
- Matrice permessi per ruolo selezionato
- Checkbox per ogni permesso
- Selezione tenant specifici
- Configurazione restrizioni campi
```

#### 3.4 Middleware Controllo Permessi
```typescript
// Middleware per verificare permessi granulari
function checkPermission(userRole: string, permission: string, context: any) {
  const rolePermissions = getRolePermissions(userRole);
  const permissionConfig = rolePermissions.find(p => p.key === permission);
  
  if (!permissionConfig) return false;
  
  // Verifica scope
  if (permissionConfig.scope === 'tenant') {
    return permissionConfig.tenantIds?.includes(context.tenantId);
  }
  
  return true;
}
```

### FASE 4: Frontend Avanzato ⏱️ 2 ore

#### 4.1 Pagina Users Migliorata
- [ ] Ordinamento per ultimo login
- [ ] Indicatore "mai loggato" per utenti senza lastLoginAt
- [ ] Form creazione utente con username auto-generato
- [ ] Mostra password temporanea dopo creazione

#### 4.2 Pagina Roles Rinnovata
- [ ] Layout diviso in due pannelli
- [ ] Gestione CRUD ruoli (sinistra)
- [ ] Matrice permessi granulari (destra)
- [ ] Configurazione restrizioni campi
- [ ] Anteprima permessi per ruolo

#### 4.3 Componenti Riutilizzabili
- [ ] `PermissionMatrix` - Matrice permessi
- [ ] `FieldRestrictionsEditor` - Editor restrizioni campi
- [ ] `TenantSelector` - Selettore tenant multipli
- [ ] `RoleEditor` - Editor ruolo con validazione

## 🔒 CONFORMITÀ GDPR E SICUREZZA

### Gestione Password
- Password di default deve essere cambiata al primo login
- Hash sicuro con bcrypt (salt rounds >= 12)
- Log delle modifiche password

### Controllo Accessi
- Audit log per modifiche ruoli e permessi
- Principio del minimo privilegio
- Separazione dei doveri

### Protezione Dati Sensibili
- Restrizioni campi configurabili per ruolo
- Mascheramento dati sensibili in UI
- Log accessi a dati riservati

## 📈 METRICHE DI SUCCESSO

### Funzionalità
- [ ] Utenti ordinati per ultimo login
- [ ] Username auto-generati univoci
- [ ] Password di default assegnate
- [ ] Ruoli gestibili via UI
- [ ] Permessi granulari configurabili
- [ ] Restrizioni campi operative

### Performance
- [ ] Caricamento pagina users < 2s
- [ ] Caricamento pagina roles < 1s
- [ ] Aggiornamento permessi < 500ms

### Sicurezza
- [ ] Nessun accesso non autorizzato
- [ ] Log audit completi
- [ ] Validazione input robusta

## 🚨 RISCHI E MITIGAZIONI

### Rischi Tecnici
1. **Performance**: Query complesse per permessi granulari
   - *Mitigazione*: Cache Redis per permessi, indici database

2. **Complessità**: Sistema permessi troppo complesso
   - *Mitigazione*: UI intuitiva, documentazione, esempi

3. **Sicurezza**: Escalation privilegi
   - *Mitigazione*: Validazione server-side, audit log

### Rischi Business
1. **Usabilità**: Interfaccia troppo complessa
   - *Mitigazione*: Test utente, feedback iterativo

2. **Manutenzione**: Sistema difficile da mantenere
   - *Mitigazione*: Codice pulito, test automatici, documentazione

## 📅 TIMELINE

```
Giorno 1 (4 ore):
├── Fase 1: Risoluzione problemi critici (30 min)
├── Fase 2: Sistema utenti avanzato (2 ore)
└── Fase 3: Inizio sistema ruoli (1.5 ore)

Giorno 2 (4 ore):
├── Fase 3: Completamento sistema ruoli (2 ore)
├── Fase 4: Frontend avanzato (2 ore)
└── Test e documentazione (30 min)
```

## 🎯 PROSSIMI PASSI IMMEDIATI

1. **Test API Roles** - Verificare risoluzione errore 404
2. **Verifica Visibilità Dati** - Controllare pagine users/roles
3. **Implementazione Ordinamento** - Query lastLoginAt
4. **Generazione Username** - Algoritmo univocità
5. **UI Pannello Ruoli** - Layout diviso

---

**Nota**: Questo planning rispetta le project-rules e mantiene la conformità GDPR. Nessun riavvio server o modifica porte richiesto.