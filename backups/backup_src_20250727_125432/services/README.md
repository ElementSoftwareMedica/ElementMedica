# Services

Questa directory contiene i servizi API e le utility per la comunicazione con il backend.

## Struttura

- `api.ts` - Funzioni base per le chiamate HTTP
- `serviceFactory.ts` - Factory per la creazione dei servizi API
- `auth.ts` - Servizio per l'autenticazione
- `employees.ts` - Servizio per la gestione dei dipendenti
- `companies.ts` - Servizio per la gestione delle aziende
- `trainers.ts` - Servizio per la gestione dei formatori
- `courses.ts` - Servizio per la gestione dei corsi
- `schedules.ts` - Servizio per la gestione delle pianificazioni
- `attestati.ts` - Servizio per la gestione dei certificati
- `templates.ts` - Servizio per la gestione dei modelli

## Pattern Factory

Tutti i servizi API seguono il pattern factory definito in `serviceFactory.ts`. Questo pattern standardizza le operazioni CRUD e permette estensioni specifiche per ogni entità.

### Esempio

```typescript
// Creazione di un servizio base
import { createService } from './serviceFactory';
import type { Entity, EntityCreate, EntityUpdate } from '../types';

const baseService = createService<Entity, EntityCreate, EntityUpdate>('/entities');

// Estensione con metodi personalizzati
const entityService = baseService.extend({
  customMethod: async (param: string): Promise<any> => {
    // Implementazione...
  }
});

// Esportazione dei metodi standard
export const getEntities = entityService.getAll;
export const getEntity = entityService.getById;
export const createEntity = entityService.create;
export const updateEntity = entityService.update;
export const deleteEntity = entityService.delete;

// Esportazione dei metodi personalizzati
export const customMethod = entityService.customMethod;

// Esportazione dell'intero servizio
export default entityService;
```

## Metodi Standard

Ogni servizio creato con la factory include:

| Metodo | Descrizione |
|--------|-------------|
| `getAll` | Recupera tutte le entità |
| `getById` | Recupera una singola entità |
| `create` | Crea una nuova entità |
| `update` | Aggiorna un'entità esistente |
| `delete` | Elimina un'entità |

## Configurazione API

La configurazione delle API è centralizzata in `src/config/api/index.ts`. Tutti i servizi utilizzano questa configurazione per gli endpoint e le opzioni.

```typescript
// src/config/api/index.ts
export const API_BASE_URL = 'http://localhost:4003'; // Proxy server

export const API_ENDPOINTS = {
  EMPLOYEES: '/employees',
  EMPLOYEE_BY_ID: (id: string) => `/employees/${id}`,
  // Altri endpoint...
};
```

## Gestione degli Errori

Le chiamate API utilizzano un wrapper per la gestione degli errori (`src/hooks/useErrorHandler.ts`). Questo hook fornisce:

- Normalizzazione degli errori
- Gestione consistente degli errori API
- Funzionalità di toast per la UI
- Logging degli errori

### Esempio di Utilizzo con useErrorHandler

```typescript
const { wrapAsync } = useErrorHandler();

const fetchData = async () => {
  const data = await wrapAsync(getEmployees(), {
    showToast: true,
    onError: (error) => {
      // Gestione personalizzata degli errori
    }
  });
  
  if (data) {
    // Procedi con i dati
  }
};
```

## Architettura del Server

I servizi comunicano con i server attraverso un proxy centralizzato:

- **API Server** (porta 4001): operazioni CRUD principali
- **Documents Server** (porta 4002): generazione di documenti
- **Proxy Server** (porta 4003): punto di ingresso centralizzato

Tutte le chiamate dal frontend passano per il Proxy Server, che si occupa dell'instradamento.

## Aggiungere un Nuovo Servizio

1. Definire i tipi in `src/types/`:

```typescript
// src/types/newEntity.ts
export interface NewEntity {
  id: string;
  name: string;
  // Altri campi...
}

export interface NewEntityCreate {
  name: string;
  // Altri campi...
}

export interface NewEntityUpdate {
  name?: string;
  // Altri campi...
}
```

2. Aggiungere gli endpoint in `src/config/api/index.ts`:

```typescript
// src/config/api/index.ts
export const API_ENDPOINTS = {
  // Endpoint esistenti...
  NEW_ENTITIES: '/new-entities',
  NEW_ENTITY_BY_ID: (id: string) => `/new-entities/${id}`,
};
```

3. Creare il servizio utilizzando il factory pattern:

```typescript
// src/services/newEntities.ts
import { createService } from './serviceFactory';
import type { NewEntity, NewEntityCreate, NewEntityUpdate } from '../types/newEntity';

const baseService = createService<NewEntity, NewEntityCreate, NewEntityUpdate>('/new-entities');

// Aggiungi metodi personalizzati se necessario
const newEntityService = baseService.extend({
  customMethod: async (param: string): Promise<any> => {
    // Implementazione...
  }
});

export const getNewEntities = newEntityService.getAll;
export const getNewEntity = newEntityService.getById;
export const createNewEntity = newEntityService.create;
export const updateNewEntity = newEntityService.update;
export const deleteNewEntity = newEntityService.delete;

export default newEntityService;
```

## Best Practices

1. **Usa sempre il pattern factory**: Non creare chiamate API ad hoc.
2. **Centralizza gli endpoint**: Aggiungi tutti gli endpoint in `config/api/index.ts`.
3. **Gestisci gli errori**: Usa sempre `useErrorHandler` per la gestione degli errori.
4. **Documenta con JSDoc**: Aggiungi commenti JSDoc a tutti i metodi personalizzati.
5. **Tipi specifici**: Definisci interfacce TypeScript chiare per ogni entità.
6. **Segui le convenzioni di nomenclatura**: Mantieni coerenza nei nomi dei metodi.

## Debugging

Per facilitare il debugging delle chiamate API, è possibile utilizzare gli strumenti di sviluppo del browser:

1. Nella console del browser, aprire la scheda "Network"
2. Filtrare per chiamate "XHR" o "Fetch"
3. Eseguire l'operazione che si vuole debuggare
4. Esaminare le richieste e le risposte

In alternativa, è possibile aggiungere console.log strategici nei servizi:

```typescript
const customMethod = async (param: string) => {
  console.log('Calling customMethod with:', param);
  try {
    const result = await apiCall(param);
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Error in customMethod:', error);
    throw error;
  }
};
```

## Collegamenti Utili

- [Documentazione React Query](https://tanstack.com/query/latest) - Per integrare i servizi con React Query
- [Axios Documentation](https://axios-http.com/docs/intro) - Per approfondire le opzioni di Axios 