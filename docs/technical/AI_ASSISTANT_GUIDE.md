# Guida per Assistenti AI

Questa guida fornisce le informazioni essenziali per lavorare efficacemente con questo progetto come assistente AI. L'obiettivo è massimizzare la coerenza e l'efficacia degli interventi sul codice.

## Panoramica del Progetto

Questo è un sistema di gestione per la formazione, con focus su:
- Tracking dei dipendenti e delle aziende
- Gestione dei corsi e dei formatori
- Pianificazione delle sessioni di formazione
- Generazione di attestati e certificati

## Architettura

### Frontend
- React/Next.js con TypeScript
- Tailwind CSS per lo styling
- Pattern centralizzati per API, stato e componenti

### Backend
- Node.js con Express
- Prisma ORM per l'accesso al database
- Architettura a tre server:
  - API Server (porta 4001) - operazioni CRUD
  - Documents Server (porta 4002) - generazione documenti
  - Proxy Server (porta 4003) - punto di ingresso centralizzato

## Regole Fondamentali

1. **NON modificare l'architettura server** - Non creare nuovi server o modificare le porte esistenti
2. **NON generare chiamate API ad hoc** - Utilizzare sempre il pattern factory
3. **NON rimuovere funzionalità esistenti** - Non eliminare componenti o funzioni
4. **SEMPRE verificare componenti esistenti** prima di crearne di nuovi
5. **SEMPRE seguire i pattern e le convenzioni esistenti**

## Dove Trovare Informazioni

Per comprendere rapidamente il progetto, consulta le regole Cursor in `.cursor/rules/`:

- `naming-conventions.mdc` - Convenzioni di nomenclatura
- `common-patterns.mdc` - Pattern comuni nel codice
- `api-guidelines.mdc` - Linee guida per le API
- `critical-sections.mdc` - Sezioni sensibili del codice
- `entity-relationships.mdc` - Relazioni tra le entità
- `type-definitions.mdc` - Definizioni dei tipi principali
- `ai-assistant-guide.mdc` - Guida specifica per assistenti AI

## Workflow Consigliato

Quando approcci una nuova richiesta o task:

1. **Analizza contesto** - Comprendi lo scopo generale della richiesta
2. **Esplora componenti esistenti** - Cerca componenti simili prima di crearne di nuovi
3. **Segui i pattern** - Identifica e segui i pattern usati nelle parti correlate
4. **Verifica le relazioni** - Comprendi le relazioni tra le entità coinvolte
5. **Implementa in modo incrementale** - Procedi con piccoli passi verificabili
6. **Mantieni i tipi** - Assicurati che tutti i componenti abbiano tipizzazione corretta

## Convenzioni di Codice

### Nomi File e Directory
- Componenti React: `PascalCase.tsx`
- Hook: `useNomeHook.ts`
- Servizi e utility: `camelCase.ts`

### Componenti React
- Componenti funzionali con TypeScript
- Props tipizzate con interfacce TypeScript
- Gestione stato con hook React

### API
- Pattern factory per i servizi
- Centralizzazione delle configurazioni
- Gestione errori consistente

### Multilinguismo
- L'app usa sia italiano che inglese in diverse parti
- Verifica i termini esistenti prima di introdurne di nuovi

## Pattern Chiave

### Factory per Servizi API
Tutti i servizi API utilizzano il pattern factory in `services/serviceFactory.ts`:

```typescript
import { createService } from './serviceFactory';
const baseService = createService<Entity, EntityCreate, EntityUpdate>('/entities');
```

### Container/Presentational
I componenti complessi seguono il pattern container/presentational:

```typescript
// Container gestisce stato e logica
export const EmployeeListContainer: React.FC = () => {
  // Logica, stato, ecc.
  return <EmployeeList employees={employees} />;
};

// Componente presentazionale (solo UI)
export const EmployeeList: React.FC<EmployeeListProps> = ({ employees }) => {
  // Solo rendering
};
```

### Custom Hooks
Gli hook personalizzati separano la logica dalla UI:

```typescript
export function useEmployees() {
  // Stato e logica
  return { employees, loading, error, fetchEmployees };
}
```

## Sezioni Critiche

Alcune parti del codice richiedono particolare attenzione:

1. **Configurazione server** in `src/config/api/index.ts`
2. **Factory dei servizi** in `src/services/serviceFactory.ts`
3. **Generazione attestati** in `src/services/attestatiService.ts`
4. **Schema database** in `backend/prisma/schema.prisma`

## Terminologia Specifica del Progetto

- **Aziende** - Termine italiano per "Companies"
- **Attestati** - Certificati/documenti di completamento corso
- **Tariffa Oraria** - Tariffa oraria per formatori (Hourly Rate)
- **Codice Fiscale** - Codice fiscale italiano, obbligatorio per i dipendenti

## Suggerimenti per Richieste Comuni

### Aggiungere un Nuovo Endpoint
1. Aggiungi l'endpoint in `src/config/api/index.ts`
2. Crea un nuovo servizio con il pattern factory
3. Verifica che tutti i tipi siano definiti correttamente

### Creare un Nuovo Componente
1. Verifica se esiste già un componente simile
2. Segui lo stile e i pattern dei componenti esistenti
3. Definisci interfacce TS per le props
4. Implementa la gestione degli errori e degli stati di loading

### Modificare lo Schema del Database
1. Verifica le migrazioni esistenti
2. Comprendi le relazioni coinvolte
3. Considera l'impatto sulle operazioni esistenti

## Best Practices per la Documentazione

1. **Documenta le funzioni con JSDoc**
2. **Spiega i passaggi complessi** con commenti inline
3. **Mantieni aggiornati i README** quando crei nuovi componenti o servizi
4. **Documenta le scelte di design** per decisioni non ovvie

## Conclusione

Seguendo questa guida, puoi aiutare a mantenere la coerenza e la qualità del codice, evitando refactoring inutili e mantenendo l'architettura dell'applicazione. Consulta sempre i file nella directory `.cursor/rules/` per informazioni più dettagliate sui vari aspetti del progetto.