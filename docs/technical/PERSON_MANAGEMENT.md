# Person Management System

## Overview

Il sistema di gestione delle persone è stato unificato per gestire in modo coerente dipendenti, formatori e utenti di sistema attraverso un'unica entità `Person` con ruoli multipli.

## Architettura

### Modello Dati

```prisma
model Person {
  id              Int           @id @default(autoincrement())
  nome            String
  cognome         String
  codice_fiscale  String        @unique
  email           String?
  telefono        String?
  indirizzo       String?
  data_nascita    DateTime?
  companyId       Int
  company         Company       @relation(fields: [companyId], references: [id])
  personRoles     PersonRole[]
  is_active       Boolean       @default(true)
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt
  deleted_at      DateTime?
  deleted_by      Int?
  
  @@map("persons")
}

model PersonRole {
  id        Int      @id @default(autoincrement())
  personId  Int
  person    Person   @relation(fields: [personId], references: [id], onDelete: Cascade)
  roleType  RoleType
  
  @@unique([personId, roleType])
  @@map("person_roles")
}

enum RoleType {
  EMPLOYEE
  TRAINER
  SYSTEM_USER
}
```

### Controller Unificato

Il `PersonController` gestisce tutte le operazioni CRUD per le persone:

- **getEmployees()**: Recupera tutti i dipendenti
- **getTrainers()**: Recupera tutti i formatori
- **getSystemUsers()**: Recupera tutti gli utenti di sistema
- **getPersonById()**: Recupera una persona specifica
- **createPerson()**: Crea una nuova persona con ruolo
- **updatePerson()**: Aggiorna una persona esistente
- **deletePerson()**: Soft delete di una persona
- **addRole()**: Aggiunge un ruolo a una persona
- **removeRole()**: Rimuove un ruolo da una persona

### Route Unificate

#### Nuove Route (`/api/persons`)

```
GET    /api/persons/employees     - Lista dipendenti
GET    /api/persons/trainers      - Lista formatori
GET    /api/persons/users         - Lista utenti di sistema
GET    /api/persons/:id           - Dettagli persona
POST   /api/persons               - Crea persona
PUT    /api/persons/:id           - Aggiorna persona
DELETE /api/persons/:id           - Elimina persona
POST   /api/persons/:id/roles     - Aggiungi ruolo
DELETE /api/persons/:id/roles     - Rimuovi ruolo
```

#### Route Retrocompatibili

Le route esistenti continuano a funzionare per garantire la compatibilità:

- `/employees/*` - Reindirizzate al PersonController
- `/users/*` - Reindirizzate al PersonController

## Compatibilità Frontend

### Trasformazione Dati

Il sistema mantiene la compatibilità con il frontend esistente attraverso:

1. **Snake Case ↔ Camel Case**: Conversione automatica dei nomi dei campi
2. **Mapping Campi**: `companyId` ↔ `company_id`
3. **Struttura Response**: Mantiene il formato atteso dal frontend

### Esempio Trasformazione

```javascript
// Database (camelCase)
{
  id: 1,
  nome: "Mario",
  cognome: "Rossi",
  codiceFiscale: "RSSMRA80A01H501Z",
  companyId: 1
}

// Frontend (snake_case)
{
  id: 1,
  nome: "Mario",
  cognome: "Rossi",
  codice_fiscale: "RSSMRA80A01H501Z",
  company_id: 1
}
```

## Middleware e Sicurezza

### Autenticazione
- Tutte le route richiedono autenticazione JWT
- Isolamento per compagnia automatico

### Autorizzazione
- Controllo permessi basato sui ruoli utente
- Validazione ownership delle risorse

### Validazione
- Validazione input con express-validator
- Sanitizzazione dati automatica

### Logging
- Log dettagliati per audit trail
- Monitoraggio performance

## Gestione Errori

### Errori Comuni

- **400 Bad Request**: Dati di input non validi
- **401 Unauthorized**: Token mancante o non valido
- **403 Forbidden**: Permessi insufficienti
- **404 Not Found**: Risorsa non trovata
- **409 Conflict**: Conflitto dati (es. codice fiscale duplicato)
- **500 Internal Server Error**: Errore server

### Formato Errore

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "codice_fiscale",
      "message": "Codice fiscale già esistente"
    }
  ]
}
```

## Testing

### Unit Tests

I test sono disponibili in `/tests/personController.test.js` e coprono:

- Tutti i metodi del controller
- Trasformazione dati
- Gestione errori
- Validazione input

### Esecuzione Test

```bash
npm test personController
```

## Migrazione

### Da Sistema Separato a Unificato

1. **Backup Database**: Sempre prima di migrare
2. **Esecuzione Migration**: Prisma gestisce la migrazione automaticamente
3. **Verifica Dati**: Controllo integrità post-migrazione
4. **Test Funzionalità**: Verifica che tutto funzioni correttamente

### Script Migrazione

```bash
# Genera migration
npx prisma migrate dev --name unified_person_system

# Applica migration
npx prisma migrate deploy

# Verifica schema
npx prisma db pull
```

## Performance

### Ottimizzazioni

- **Eager Loading**: Include relazioni necessarie
- **Indexing**: Indici su campi frequentemente interrogati
- **Caching**: Cache Redis per query frequenti
- **Pagination**: Supporto paginazione per liste grandi

### Monitoring

- Metriche performance tramite middleware
- Log query lente
- Monitoraggio utilizzo memoria

## Roadmap

### Prossimi Sviluppi

1. **Cache Layer**: Implementazione cache Redis
2. **Bulk Operations**: Operazioni batch per performance
3. **Advanced Search**: Ricerca full-text
4. **Export/Import**: Funzionalità import/export CSV
5. **Audit Trail**: Log dettagliato modifiche

### Miglioramenti Futuri

- GraphQL API per query flessibili
- Real-time updates con WebSocket
- Machine Learning per suggerimenti
- Mobile API ottimizzata

## Supporto

Per domande o problemi:

1. Controlla i log dell'applicazione
2. Verifica la documentazione API
3. Esegui i test per identificare regressioni
4. Contatta il team di sviluppo