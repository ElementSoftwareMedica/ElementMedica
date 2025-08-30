# Configurazioni GDPR per Person

Questo documento descrive le configurazioni GDPR implementate per l'entità unificata `Person`, che supporta sia employees che trainers.

## File Principali

### 1. `personPermissions.ts`
Definisce i permessi granulari per l'entità Person:

- **Permessi Base**: `READ`, `WRITE`, `DELETE`, `EXPORT`
- **Permessi Specifici Employees**: `VIEW_EMPLOYEES`, `CREATE_EMPLOYEES`, `EDIT_EMPLOYEES`, `DELETE_EMPLOYEES`
- **Permessi Specifici Trainers**: `VIEW_TRAINERS`, `CREATE_TRAINERS`, `EDIT_TRAINERS`, `DELETE_TRAINERS`
- **Permessi GDPR**: `VIEW_GDPR`, `CREATE_GDPR`, `EDIT_GDPR`, `DELETE_GDPR`, `EXPORT_GDPR_DATA`, `MANAGE_CONSENTS`

### 2. `personGDPRConfig.ts`
Configurazioni GDPR semplificate per diversi tipi di entità:

- **EMPLOYEES_GDPR_SIMPLE_CONFIG**: Livello GDPR completo per dipendenti
- **TRAINERS_GDPR_SIMPLE_CONFIG**: Livello GDPR standard per formatori
- **ALL_PERSONS_GDPR_SIMPLE_CONFIG**: Configurazione per vista unificata

## Utilizzo

### In PersonsPage.tsx

```typescript
import { PersonGDPRConfigFactory } from '../../config/personGDPRConfig';

// Ottieni configurazione basata sul tipo di filtro
const gdprConfig = PersonGDPRConfigFactory.getConfigByFilterType(filterType);

// Usa i permessi dinamici
const permissions = gdprConfig.permissions;
```

### Factory Methods

```typescript
// Configurazioni specifiche
PersonGDPRConfigFactory.getEmployeesConfig()
PersonGDPRConfigFactory.getTrainersConfig()
PersonGDPRConfigFactory.getAllPersonsConfig()

// Configurazione dinamica
PersonGDPRConfigFactory.getConfigByFilterType('employees' | 'trainers' | 'all')

// Utility
PersonGDPRConfigFactory.isOperationAllowed(filterType, operation)
PersonGDPRConfigFactory.getGDPRLevel(filterType)
```

## Livelli GDPR

### Comprehensive (Dipendenti)
- Audit completo
- Minimizzazione dati attiva
- Consensi obbligatori per elaborazione dati di lavoro
- Operazioni batch abilitate

### Standard (Formatori)
- Audit standard
- Minimizzazione dati disabilitata
- Consensi per elaborazione dati di formazione
- Operazioni batch limitate

## Permessi per Ruolo

### SUPER_ADMIN
- Tutti i permessi su employees e trainers
- Gestione GDPR completa

### HR_MANAGER
- Tutti i permessi su employees
- Permessi limitati su trainers

### TRAINER_COORDINATOR
- Tutti i permessi su trainers
- Permessi limitati su employees

### MANAGER
- Lettura employees del proprio dipartimento
- Nessun permesso su trainers

### EMPLOYEE / TRAINER
- Solo lettura dei propri dati

## Campi Sensibili GDPR

I seguenti campi sono considerati sensibili e soggetti a regole GDPR:
- `fiscalCode`
- `birthDate`
- `phone`
- `address`
- `emergencyContact`
- `medicalInfo`
- `bankDetails`

## Consensi

### Obbligatori per Employees
- `data_processing`
- `data_storage`
- `employment_data_processing`

### Obbligatori per Trainers
- `data_processing`
- `data_storage`
- `training_data_processing`

### Opzionali
- `marketing_communications`
- `analytics_tracking`
- `professional_networking`
- `certification_sharing`

## Integrazione con GDPREntityTemplate

Le configurazioni sono progettate per integrarsi seamlessly con il template GDPR esistente:

```typescript
<GDPREntityTemplate<Person>
  entityName={gdprConfig.entityType}
  entityDisplayName={gdprConfig.displayName}
  readPermission={permissions.read}
  writePermission={permissions.write || permissions.create}
  deletePermission={permissions.delete}
  exportPermission={permissions.export}
  enableBatchOperations={gdprConfig.gdprLevel === 'comprehensive'}
  // ... altre props
/>
```

## Note di Implementazione

1. **Compatibilità**: Le configurazioni sono retrocompatibili con il sistema esistente
2. **Estensibilità**: Nuovi tipi di filtro possono essere aggiunti facilmente
3. **Sicurezza**: I permessi sono verificati a livello di configurazione
4. **Performance**: Le configurazioni sono memoizzate per ottimizzare le performance

## Prossimi Passi

1. Implementare test unitari per le configurazioni
2. Aggiungere validazione runtime dei permessi
3. Estendere il sistema per supportare ruoli personalizzati
4. Implementare audit trail per le modifiche ai permessi