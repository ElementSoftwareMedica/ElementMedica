# Analisi Dipendenze PersonService

## File che Utilizzano PersonService

### Controller
- **personController.js** (628 righe)
  - Utilizza tutte le funzioni principali di PersonService
  - Gestisce endpoint API per persone, dipendenti, formatori, utenti sistema
  - Applica trasformazioni per backward compatibility
  - Integra con enhancedRoleService per permessi

### Metodi PersonService Utilizzati
1. `getEmployees()` - Ottieni dipendenti
2. `getTrainers()` - Ottieni formatori  
3. `getSystemUsers()` - Ottieni utenti sistema
4. `searchPersons()` - Ricerca persone
5. `getPersonById()` - Ottieni persona per ID
6. `createPerson()` - Crea persona
7. `updatePerson()` - Aggiorna persona
8. `deletePerson()` - Elimina persona
9. `importPersonsFromCSV()` - Importa da CSV
10. `importPersonsFromJSON()` - Importa da JSON
11. `exportPersonsToCSV()` - Esporta in CSV

## Analisi Struttura PersonService (1489 righe)

### Sezioni Principali Identificate

#### 1. Configurazioni e Mappature (righe 1-70)
- `ROLE_MAPPING` - Mappatura ruoli italiani/inglesi
- `mapRoleType()` - Funzione di mappatura ruoli

#### 2. Operazioni CRUD Base (righe 71-400)
- `getPersonsByRole()` - Ottieni persone per ruolo
- `getEmployees()` - Wrapper per dipendenti
- `getTrainers()` - Wrapper per formatori
- `getSystemUsers()` - Wrapper per utenti sistema
- `searchPersons()` - Ricerca avanzata
- `getPersonsWithPagination()` - Paginazione

#### 3. Gestione Singole Persone (righe 401-600)
- `getPersonById()` - Ottieni per ID
- `createPerson()` - Creazione persona
- `updatePerson()` - Aggiornamento persona
- `deletePerson()` - Eliminazione (soft delete)

#### 4. Utilità e Validazioni (righe 601-800)
- `generateUniqueUsername()` - Genera username unico
- `validatePersonData()` - Validazione dati
- `checkDuplicates()` - Controllo duplicati

#### 5. Import/Export (righe 801-1200)
- `exportPersonsToCSV()` - Esportazione CSV
- `importPersonsFromJSON()` - Importazione JSON (PROBLEMATICA)
- `importPersonsFromCSV()` - Importazione CSV

#### 6. Funzioni Avanzate (righe 1201-1489)
- `updatePersonPreferences()` - Preferenze utente
- `getPersonStats()` - Statistiche
- `bulkOperations()` - Operazioni bulk

## Problemi Identificati

### 1. Funzioni Troppo Lunghe
- `importPersonsFromJSON()` - 200+ righe
- `importPersonsFromCSV()` - 150+ righe
- `createPerson()` - 100+ righe
- `getPersonsByRole()` - 80+ righe

### 2. Responsabilità Miste
- Logica di business + validazione + trasformazione dati
- Import/export + CRUD + ricerca
- Mappatura ruoli + gestione permessi

### 3. Codice Duplicato
- Logica di trasformazione dati ripetuta
- Validazioni simili in più metodi
- Query Prisma simili

### 4. Configurazioni Hardcoded
- `ROLE_MAPPING` molto lungo e statico
- Logica di validazione hardcoded
- Trasformazioni dati hardcoded

## Piano di Refactoring PersonService

### Fase 1: Separazione Responsabilità
1. **PersonService** (core CRUD)
2. **PersonValidationService** (validazioni)
3. **PersonImportService** (import/export)
4. **PersonSearchService** (ricerca avanzata)
5. **PersonRoleService** (gestione ruoli)

### Fase 2: Estrazione Configurazioni
1. **RoleMappingConfig** (mappature ruoli)
2. **PersonValidationRules** (regole validazione)
3. **PersonTransformers** (trasformazioni dati)

### Fase 3: Ottimizzazione Query
1. **PersonRepository** (query Prisma ottimizzate)
2. **PersonQueryBuilder** (costruzione query dinamiche)

### Fase 4: Utilità Comuni
1. **PersonUtils** (funzioni utility)
2. **PersonConstants** (costanti)

## Struttura Target

```
services/
├── person/
│   ├── PersonService.js (core, max 300 righe)
│   ├── PersonValidationService.js
│   ├── PersonImportService.js
│   ├── PersonSearchService.js
│   └── PersonRoleService.js
├── config/
│   ├── RoleMappingConfig.js
│   ├── PersonValidationRules.js
│   └── PersonTransformers.js
├── repositories/
│   └── PersonRepository.js
└── utils/
    ├── PersonUtils.js
    └── PersonConstants.js
```

## Priorità di Implementazione

### Alta Priorità
1. Estrazione `PersonImportService` (risolve problemi import CSV)
2. Estrazione `RoleMappingConfig` (semplifica manutenzione)
3. Ottimizzazione `importPersonsFromJSON()` (problema corrente)

### Media Priorità
4. Estrazione `PersonValidationService`
5. Creazione `PersonRepository`
6. Ottimizzazione query principali

### Bassa Priorità
7. Estrazione `PersonSearchService`
8. Creazione utilità comuni
9. Documentazione completa

## Test di Regressione Necessari

### Test Funzionali
- [ ] Import CSV funzionante
- [ ] Import JSON senza errori unique constraint
- [ ] CRUD operazioni base
- [ ] Ricerca e filtri
- [ ] Export CSV

### Test di Integrazione
- [ ] PersonController endpoints
- [ ] Integrazione con enhancedRoleService
- [ ] Gestione permessi
- [ ] Backward compatibility

### Test Performance
- [ ] Query ottimizzate
- [ ] Tempo di risposta invariato
- [ ] Memoria utilizzata
- [ ] Operazioni bulk