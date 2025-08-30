# 🏷️ Fase 2: Naming & Convenzioni

**Durata Stimata**: 2-3 giorni  
**Stato**: Planning  
**Priorità**: Alta  
**Dipendenze**: Fase 1 completata

## 🎯 Obiettivi Fase 2

1. **Standardizzazione camelCase**: Conversione tutti i campi snake_case
2. **Rimozione @map Superflui**: Eliminazione mapping ridondanti
3. **Uniformità Nomenclatura**: Consistenza naming cross-modelli
4. **Backward Compatibility**: Mantenimento funzionalità esistenti

## 📋 Task Dettagliati

### 2.1 Preparazione Refactoring

#### 2.1.1 Backup Pre-Refactoring
```bash
# Backup specifico pre-naming
cp backend/prisma/schema.prisma backend/prisma/schema.prisma.pre-naming-$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U postgres -d project_db > backup_pre_naming_$(date +%Y%m%d_%H%M%S).sql
```

#### 2.1.2 Analisi Dipendenze Codice
- [ ] Scan tutti i file .js/.ts per riferimenti snake_case
- [ ] Identificazione query Prisma impattate
- [ ] Mappatura API endpoints che usano campi snake_case
- [ ] Verifica frontend components con naming attuale

### 2.2 Conversione Schema Prisma

#### 2.2.1 Modello Company
```prisma
// PRIMA:
model Company {
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  codice_ateco        String?
  persona_riferimento String?
  sede_azienda        String?
  subscription_plan   String @default("basic")
  is_active           Boolean @default(true)
  // ...
}

// DOPO:
model Company {
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  codiceAteco        String?
  personaRiferimento String?
  sedeAzienda        String?
  subscriptionPlan   String @default("basic")
  isActive           Boolean @default(true)
  // ...
}
```

#### 2.2.2 Modello Course
```prisma
// PRIMA:
model Course {
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  // ...
}

// DOPO:
model Course {
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  // ...
}
```

#### 2.2.3 Modello CourseSchedule
```prisma
// PRIMA:
model CourseSchedule {
  start_date       DateTime
  end_date         DateTime
  max_participants Int?
  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  delivery_mode    String?
  // ...
}

// DOPO:
model CourseSchedule {
  startDate       DateTime
  endDate         DateTime
  maxParticipants Int?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deliveryMode    String?
  // ...
}
```

### 2.3 Lista Completa Conversioni

#### 2.3.1 Campi Timestamp Standard
```prisma
// Conversioni universali (tutti i modelli):
created_at → createdAt
updated_at → updatedAt
deleted_at → deletedAt (mantenere @map per compatibilità DB)
```

#### 2.3.2 Campi Specifici per Modello

**Company**:
```prisma
codice_ateco → codiceAteco
persona_riferimento → personaRiferimento
sede_azienda → sedeAzienda
subscription_plan → subscriptionPlan
is_active → isActive
```

**CourseSchedule**:
```prisma
start_date → startDate
end_date → endDate
max_participants → maxParticipants
delivery_mode → deliveryMode
```

**CourseEnrollment**:
```prisma
employee_id → personId (già mappato correttamente)
```

**Attestato**:
```prisma
scheduled_course_id → scheduledCourseId
partecipante_id → personId
nome_file → fileName
data_generazione → generatedAt
numero_progressivo → numeroProgressivo
anno_progressivo → annoProgressivo
created_at → createdAt
updated_at → updatedAt
```

**RegistroPresenze**:
```prisma
data_generazione → generatedAt
numero_progressivo → numeroProgressivo
anno_progressivo → annoProgressivo
created_at → createdAt
updated_at → updatedAt
```

**TestPartecipante**:
```prisma
test_id → testId
partecipante_id → personId
data_consegna → dataConsegna
tempo_impiegato → tempoImpiegato
created_at → createdAt
updated_at → updatedAt
```

**Tenant Models**:
```prisma
// TenantConfiguration
tenant_id → tenantId
config_key → configKey
config_value → configValue
config_type → configType
is_encrypted → isEncrypted
created_at → createdAt
updated_at → updatedAt

// EnhancedUserRole
user_id → personId
tenant_id → tenantId
role_type → roleType
role_scope → roleScope
company_id → companyId
department_id → departmentId
is_active → isActive
assigned_by → assignedBy
assigned_at → assignedAt
expires_at → expiresAt
created_at → createdAt
updated_at → updatedAt

// TenantUsage
tenant_id → tenantId
usage_type → usageType
usage_value → usageValue
usage_limit → usageLimit
billing_period → billingPeriod
created_at → createdAt
updated_at → updatedAt

// CustomRole
tenant_id → tenantId
is_active → isActive
tenant_access → tenantAccess
created_by → createdBy
created_at → createdAt
updated_at → updatedAt

// CustomRolePermission
custom_role_id → customRoleId
allowed_fields → allowedFields
created_at → createdAt
updated_at → updatedAt

// AdvancedPermission
person_role_id → personRoleId
allowed_fields → allowedFields
created_at → createdAt
updated_at → updatedAt
```

### 2.4 Gestione @map Strategica

#### 2.4.1 @map da Mantenere (Compatibilità DB)
```prisma
// Mantenere per campi che differiscono dal nome tabella DB:
deletedAt DateTime? @map("deleted_at") // DB usa snake_case
tenantId String @map("tenant_id") // Se DB usa snake_case
personId String @map("employee_id") // Legacy compatibility
```

#### 2.4.2 @map da Rimuovere (Post-Conversione)
```prisma
// Rimuovere quando campo e colonna DB coincidono:
createdAt DateTime @default(now()) // Rimuovere @map("created_at")
updatedAt DateTime @updatedAt // Rimuovere @map("updated_at")
```

### 2.5 Aggiornamento Codice Backend

#### 2.5.1 Controller Updates
```javascript
// PRIMA:
const companies = await prisma.company.findMany({
  select: {
    id: true,
    ragione_sociale: true,
    created_at: true,
    is_active: true
  }
});

// DOPO:
const companies = await prisma.company.findMany({
  select: {
    id: true,
    ragioneSociale: true,
    createdAt: true,
    isActive: true
  }
});
```

#### 2.5.2 Service Layer Updates
```javascript
// PRIMA:
const schedule = await prisma.courseSchedule.create({
  data: {
    start_date: startDate,
    end_date: endDate,
    max_participants: maxParticipants,
    delivery_mode: deliveryMode
  }
});

// DOPO:
const schedule = await prisma.courseSchedule.create({
  data: {
    startDate: startDate,
    endDate: endDate,
    maxParticipants: maxParticipants,
    deliveryMode: deliveryMode
  }
});
```

### 2.6 Aggiornamento Frontend

#### 2.6.1 API Service Updates
```typescript
// PRIMA:
interface Company {
  id: string;
  ragione_sociale: string;
  created_at: string;
  is_active: boolean;
}

// DOPO:
interface Company {
  id: string;
  ragioneSociale: string;
  createdAt: string;
  isActive: boolean;
}
```

#### 2.6.2 Component Updates
```tsx
// PRIMA:
<TableCell>{company.created_at}</TableCell>
<TableCell>{company.is_active ? 'Attiva' : 'Inattiva'}</TableCell>

// DOPO:
<TableCell>{company.createdAt}</TableCell>
<TableCell>{company.isActive ? 'Attiva' : 'Inattiva'}</TableCell>
```

### 2.7 Script di Automazione

#### 2.7.1 Schema Refactoring Script
```javascript
// refactor-schema-naming.js
const fs = require('fs');
const path = require('path');

const CONVERSIONS = {
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'start_date': 'startDate',
  'end_date': 'endDate',
  // ... tutte le conversioni
};

function refactorSchema(schemaPath) {
  let content = fs.readFileSync(schemaPath, 'utf8');
  
  Object.entries(CONVERSIONS).forEach(([oldName, newName]) => {
    // Regex per sostituire solo i nomi dei campi, non i @map
    const regex = new RegExp(`\\b${oldName}\\s+`, 'g');
    content = content.replace(regex, `${newName} `);
  });
  
  fs.writeFileSync(schemaPath, content);
}
```

#### 2.7.2 Code Refactoring Script
```javascript
// refactor-code-naming.js
const glob = require('glob');
const fs = require('fs');

function refactorCodeFiles(pattern) {
  const files = glob.sync(pattern);
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Sostituzioni specifiche per query Prisma
    Object.entries(CONVERSIONS).forEach(([oldName, newName]) => {
      // Sostituisci in select, where, data, etc.
      content = content.replace(
        new RegExp(`(['"`])${oldName}(['"`])`, 'g'),
        `$1${newName}$2`
      );
    });
    
    fs.writeFileSync(file, content);
  });
}
```

## 🧪 Testing Strategy

### 2.8.1 Unit Tests
```javascript
// test-naming-conversion.test.js
describe('Naming Convention Conversion', () => {
  test('Company model uses camelCase fields', async () => {
    const company = await prisma.company.findFirst();
    expect(company).toHaveProperty('createdAt');
    expect(company).toHaveProperty('updatedAt');
    expect(company).toHaveProperty('isActive');
    expect(company).not.toHaveProperty('created_at');
  });
  
  test('CourseSchedule model uses camelCase fields', async () => {
    const schedule = await prisma.courseSchedule.findFirst();
    expect(schedule).toHaveProperty('startDate');
    expect(schedule).toHaveProperty('endDate');
    expect(schedule).toHaveProperty('maxParticipants');
  });
});
```

### 2.8.2 Integration Tests
```javascript
// test-api-compatibility.test.js
describe('API Compatibility After Naming Changes', () => {
  test('GET /api/companies returns camelCase fields', async () => {
    const response = await request(app)
      .get('/api/companies')
      .expect(200);
    
    expect(response.body[0]).toHaveProperty('createdAt');
    expect(response.body[0]).toHaveProperty('isActive');
  });
});
```

## ✅ Criteri di Completamento

- [ ] Tutti i campi convertiti a camelCase
- [ ] @map superflui rimossi
- [ ] @map necessari mantenuti
- [ ] Backend code aggiornato
- [ ] Frontend code aggiornato
- [ ] Test suite passa al 100%
- [ ] API endpoints funzionanti
- [ ] Performance non degradate

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Breaking changes API | Alta | Alto | Test completi + rollback plan |
| Frontend errors | Media | Medio | Aggiornamento graduale |
| Database inconsistency | Bassa | Alto | @map strategici |
| Performance degradation | Bassa | Medio | Monitoring continuo |

## 📊 Checklist Validazione

### Pre-Deployment
- [ ] Schema backup creato
- [ ] Tutti i test passano
- [ ] Code review completato
- [ ] Performance test OK

### Post-Deployment
- [ ] API endpoints funzionanti
- [ ] Frontend carica correttamente
- [ ] Database queries efficienti
- [ ] Nessun errore in logs

## 📞 Prossimi Passi

Al completamento Fase 2:
1. **Verifica completa** funzionalità sistema
2. **Performance baseline** post-refactoring
3. **Preparazione Fase 3** (Indici & Vincoli)
4. **Documentazione** aggiornamenti effettuati

---

**Nota**: Questa fase è critica per la stabilità del sistema. Procedere con cautela e testing approfondito.