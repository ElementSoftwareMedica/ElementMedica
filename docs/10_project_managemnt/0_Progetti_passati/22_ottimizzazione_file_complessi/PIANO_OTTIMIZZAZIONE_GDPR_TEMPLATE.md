# Piano Ottimizzazione GDPREntityTemplate.tsx

## Analisi File Attuale
- **File**: `src/templates/gdpr-entity-page/GDPREntityTemplate.tsx`
- **Dimensioni**: 1061 righe
- **Priorità**: 🔴 CRITICA
- **Complessità**: Molto Alta

## Problemi Identificati

### 1. Responsabilità Multiple
Il file gestisce troppe responsabilità:
- Gestione permessi (150+ righe)
- Gestione stato (50+ righe)
- Caricamento dati (100+ righe)
- Operazioni CRUD (200+ righe)
- Filtraggio e ricerca (100+ righe)
- Configurazione colonne (150+ righe)
- Rendering tabella/griglia (200+ righe)
- UI e layout (100+ righe)

### 2. Logica Complessa
- Funzioni troppo lunghe (alcune >100 righe)
- Logica di permessi duplicata
- Gestione stato complessa
- Troppi useEffect e useMemo

### 3. Accoppiamento Alto
- Dipendenze dirette da molti servizi
- Logica UI mista con logica business
- Configurazioni hardcoded

## Piano di Suddivisione

### Fase 1: Estrazione Hook Personalizzati

#### 1.1 Hook Permessi
**File**: `src/templates/gdpr-entity-page/hooks/useGDPRPermissions.ts`
```typescript
export function useGDPRPermissions(
  entityName: string,
  entityNamePlural: string,
  readPermission: string,
  writePermission: string,
  deletePermission: string,
  exportPermission?: string
)
```

#### 1.2 Hook Gestione Entità
**File**: `src/templates/gdpr-entity-page/hooks/useGDPREntityData.ts`
```typescript
export function useGDPREntityData<T>(
  apiEndpoint: string,
  entityNamePlural: string,
  entityDisplayNamePlural: string
)
```

#### 1.3 Hook Operazioni CRUD
**File**: `src/templates/gdpr-entity-page/hooks/useGDPREntityOperations.ts`
```typescript
export function useGDPREntityOperations<T>(
  apiEndpoint: string,
  entityName: string,
  entityDisplayName: string,
  onDeleteEntity?: (id: string) => Promise<void>
)
```

#### 1.4 Hook Filtri e Ricerca
**File**: `src/templates/gdpr-entity-page/hooks/useGDPRFilters.ts`
```typescript
export function useGDPRFilters<T>(
  entities: T[],
  searchFields: (keyof T)[],
  filterOptions: FilterOption[]
)
```

#### 1.5 Hook Gestione Colonne
**File**: `src/templates/gdpr-entity-page/hooks/useGDPRColumns.ts`
```typescript
export function useGDPRColumns<T>(
  columns: DataTableColumn<T>[],
  entityNamePlural: string,
  selectionMode: boolean,
  enableBatchOperations: boolean
)
```

### Fase 2: Estrazione Componenti UI

#### 2.1 Componente Header
**File**: `src/templates/gdpr-entity-page/components/GDPREntityHeader.tsx`
- Gestione header con titolo e controlli
- ViewModeToggle
- AddEntityDropdown
- SearchBar e FilterPanel

#### 2.2 Componente Toolbar
**File**: `src/templates/gdpr-entity-page/components/GDPREntityToolbar.tsx`
- ColumnSelector
- BatchEditButton
- Filtri avanzati

#### 2.3 Componente Vista Tabella
**File**: `src/templates/gdpr-entity-page/components/GDPREntityTable.tsx`
- ResizableTable configurato
- Gestione colonne
- Gestione selezione

#### 2.4 Componente Vista Griglia
**File**: `src/templates/gdpr-entity-page/components/GDPREntityGrid.tsx`
- Rendering card entities
- Layout griglia responsive

#### 2.5 Componente Card Entità
**File**: `src/templates/gdpr-entity-page/components/GDPREntityCard.tsx`
- Rendering singola card
- Gestione azioni
- Configurazione dinamica

### Fase 3: Estrazione Utilità

#### 3.1 Utilità Permessi
**File**: `src/templates/gdpr-entity-page/utils/permissions.utils.ts`
- Funzioni helper per controllo permessi
- Logica di bypass admin
- Parsing permessi

#### 3.2 Utilità Configurazione
**File**: `src/templates/gdpr-entity-page/utils/config.utils.ts`
- Gestione configurazioni default
- Validazione props
- Merge configurazioni

#### 3.3 Utilità Dati
**File**: `src/templates/gdpr-entity-page/utils/data.utils.ts`
- Trasformazione dati API
- Gestione risposte paginate
- Normalizzazione entità

### Fase 4: Refactoring Template Principale

#### 4.1 Template Semplificato
**File**: `src/templates/gdpr-entity-page/GDPREntityTemplate.tsx` (target: ~200 righe)
```typescript
export function GDPREntityTemplate<T>({...props}) {
  // Solo orchestrazione dei componenti e hook
  const permissions = useGDPRPermissions(...);
  const { entities, loading, error } = useGDPREntityData(...);
  const operations = useGDPREntityOperations(...);
  const filters = useGDPRFilters(...);
  const columns = useGDPRColumns(...);

  if (!permissions.canRead) {
    return <AccessDenied />;
  }

  return (
    <EntityListLayout>
      <GDPREntityHeader {...headerProps} />
      <GDPREntityToolbar {...toolbarProps} />
      {viewMode === 'table' ? (
        <GDPREntityTable {...tableProps} />
      ) : (
        <GDPREntityGrid {...gridProps} />
      )}
    </EntityListLayout>
  );
}
```

## Struttura File Finale

```
src/templates/gdpr-entity-page/
├── GDPREntityTemplate.tsx (200 righe)
├── components/
│   ├── GDPREntityHeader.tsx (150 righe)
│   ├── GDPREntityToolbar.tsx (100 righe)
│   ├── GDPREntityTable.tsx (150 righe)
│   ├── GDPREntityGrid.tsx (100 righe)
│   ├── GDPREntityCard.tsx (120 righe)
│   └── AccessDenied.tsx (50 righe)
├── hooks/
│   ├── useGDPRPermissions.ts (100 righe)
│   ├── useGDPREntityData.ts (120 righe)
│   ├── useGDPREntityOperations.ts (150 righe)
│   ├── useGDPRFilters.ts (80 righe)
│   └── useGDPRColumns.ts (100 righe)
├── utils/
│   ├── permissions.utils.ts (80 righe)
│   ├── config.utils.ts (60 righe)
│   └── data.utils.ts (70 righe)
└── types/
    └── gdpr-template.types.ts (100 righe)
```

## Benefici Attesi

### 1. Manutenibilità
- File più piccoli e focalizzati
- Responsabilità separate
- Codice più leggibile

### 2. Riusabilità
- Hook riutilizzabili in altri template
- Componenti modulari
- Utilità condivise

### 3. Testing
- Test unitari per ogni modulo
- Mock più semplici
- Coverage migliore

### 4. Performance
- Lazy loading dei componenti
- Memoizzazione ottimizzata
- Bundle splitting

## Piano di Implementazione

### Step 1: Preparazione (30 min)
- [x] Analisi file esistente
- [x] Creazione piano dettagliato
- [ ] Setup struttura cartelle

### Step 2: Estrazione Hook (2 ore)
- [ ] useGDPRPermissions
- [ ] useGDPREntityData
- [ ] useGDPREntityOperations
- [ ] useGDPRFilters
- [ ] useGDPRColumns

### Step 3: Estrazione Componenti (2 ore)
- [ ] GDPREntityHeader
- [ ] GDPREntityToolbar
- [ ] GDPREntityTable
- [ ] GDPREntityGrid
- [ ] GDPREntityCard

### Step 4: Estrazione Utilità (1 ora)
- [ ] permissions.utils
- [ ] config.utils
- [ ] data.utils

### Step 5: Refactoring Template (1 ora)
- [ ] Semplificazione template principale
- [ ] Integrazione nuovi moduli
- [ ] Cleanup codice duplicato

### Step 6: Testing (1 ora)
- [ ] Test funzionalità esistenti
- [ ] Verifica compatibilità
- [ ] Test performance

## Rischi e Mitigazioni

### Rischi
1. **Rottura compatibilità**: Modifiche alle interfacce pubbliche
2. **Regressioni**: Perdita di funzionalità esistenti
3. **Performance**: Overhead aggiuntivo da modularizzazione

### Mitigazioni
1. **Mantenimento interfacce**: Preservare API pubbliche esistenti
2. **Testing completo**: Test prima e dopo ogni modifica
3. **Benchmark**: Misurare performance prima e dopo

## Criteri di Successo

### Quantitativi
- [x] File principale < 300 righe (target: 200)
- [ ] Nessun file > 200 righe
- [ ] Nessuna funzione > 50 righe
- [ ] Coverage test > 80%

### Qualitativi
- [ ] Codice più leggibile
- [ ] Manutenzione semplificata
- [ ] Riusabilità migliorata
- [ ] Performance mantenuta

## 📋 Stato Implementazione

### ✅ Completato
- [x] Analisi file originale (1060 righe)
- [x] Identificazione responsabilità multiple
- [x] Progettazione architettura modulare
- [x] Creazione struttura cartelle
- [x] Hook `useGDPRPermissions` - Gestione permessi
- [x] Hook `useGDPREntityData` - Caricamento dati
- [x] Hook `useGDPRFilters` - Filtri e ricerca
- [x] Hook `useGDPRColumns` - Gestione colonne
- [x] Tipi TypeScript centralizzati
- [x] Utility permessi GDPR-compliant
- [x] Utility configurazione template

### 🔄 In Corso
- [ ] Estrazione componenti UI
- [ ] Refactoring template principale
- [ ] Integrazione hook esistente `useGDPREntityOperations`

### ⏳ Da Fare
- [ ] Componenti UI modulari
- [ ] Template principale ottimizzato
- [ ] Testing e validazione
- [ ] Documentazione componenti

- **Fase Attuale**: Implementazione Componenti UI
- **Prossimo Step**: Estrazione GDPREntityHeader
- **Tempo Stimato**: 3 ore rimanenti
- **Priorità**: Alta