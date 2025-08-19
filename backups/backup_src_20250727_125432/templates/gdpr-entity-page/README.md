# GDPR Entity Template

Template unificato per la gestione di entità con conformità GDPR, che integra i pattern e componenti UI dalle pagine companies e courses.

## Panoramica

Il `GDPREntityTemplate` è un componente React riutilizzabile che fornisce una soluzione completa per la gestione di entità con:

- ✅ **Conformità GDPR** completa
- 🔐 **Sistema di permessi** basato su ruoli
- 🎨 **UI moderna** con componenti riutilizzabili
- 📊 **Visualizzazioni multiple** (tabella/griglia)
- 🔍 **Ricerca e filtri** avanzati
- 📤 **Import/Export CSV** con validazione
- ⚡ **Operazioni batch** per efficienza
- 🎯 **Personalizzazione completa** per ogni entità

## Struttura dei File

```
src/templates/gdpr-entity-page/
├── GDPREntityTemplate.tsx      # Componente template principale
├── GDPREntityConfig.ts         # Configurazioni predefinite
├── README.md                   # Questa documentazione
└── examples/
    ├── CompaniesPageExample.tsx # Esempio implementazione aziende
    └── CoursesPageExample.tsx   # Esempio implementazione corsi
```

## Utilizzo Base

### 1. Importazione

```typescript
import { GDPREntityTemplate } from '../templates/gdpr-entity-page/GDPREntityTemplate';
import { companiesConfig } from '../templates/gdpr-entity-page/GDPREntityConfig';
```

### 2. Implementazione Semplice

```typescript
export const MyEntityPage: React.FC = () => {
  return (
    <GDPREntityTemplate<MyEntity>
      {...companiesConfig} // Usa configurazione predefinita
      columns={myColumns}
    />
  );
};
```

### 3. Implementazione Personalizzata

```typescript
export const MyEntityPage: React.FC = () => {
  const handleCreate = () => navigate('/my-entity/create');
  const handleEdit = (entity) => navigate(`/my-entity/${entity.id}/edit`);
  
  return (
    <GDPREntityTemplate<MyEntity>
      // Configurazione base
      entityName="my-entity"
      entityDisplayName="La Mia Entità"
      entityDisplayNamePlural="Le Mie Entità"
      
      // API endpoints
      apiEndpoint="/api/v1/my-entities"
      
      // Permessi
      readPermission="my-entity.read"
      writePermission="my-entity.write"
      deletePermission="my-entity.delete"
      
      // Colonne
      columns={myColumns}
      
      // Handler personalizzati
      onCreateEntity={handleCreate}
      onEditEntity={handleEdit}
      
      // Configurazioni UI
      enableBatchOperations={true}
      enableImportExport={true}
      defaultViewMode="table"
    />
  );
};
```

## Configurazioni Predefinite

Il file `GDPREntityConfig.ts` fornisce configurazioni pronte per:

- **Companies** (`companiesConfig`)
- **Courses** (`coursesConfig`)
- **Employees** (`employeesConfig`)

### Utilizzo Configurazioni Predefinite

```typescript
import { companiesConfig, coursesConfig } from './GDPREntityConfig';

// Per aziende
<GDPREntityTemplate<Company> {...companiesConfig} />

// Per corsi
<GDPREntityTemplate<Course> {...coursesConfig} />
```

## Definizione Colonne

### Colonne Standard

```typescript
import { createStandardColumns } from './GDPREntityConfig';

const columns = createStandardColumns<MyEntity>([
  { key: 'name', label: 'Nome', width: 200 },
  { key: 'email', label: 'Email', width: 250 },
  { 
    key: 'status', 
    label: 'Stato', 
    width: 120,
    formatter: (value) => <Badge>{value}</Badge>
  }
]);
```

### Colonne Personalizzate

```typescript
const columns: DataTableColumn<MyEntity>[] = [
  {
    key: 'name',
    label: 'Nome',
    sortable: true,
    width: 200,
    renderCell: (entity) => (
      <div className="font-medium">
        {entity.name}
      </div>
    )
  },
  {
    key: 'status',
    label: 'Stato',
    sortable: true,
    width: 120,
    renderCell: (entity) => (
      <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
        {entity.status}
      </Badge>
    )
  }
];
```

## Componenti UI Integrati

### Toggle Visualizzazione (Tabella/Griglia)

```typescript
// Automaticamente incluso nel template
<ViewModeToggle 
  value={viewMode}
  onChange={setViewMode}
/>
```

### Dropdown Azioni

```typescript
// Configurazione automatica con:
// - Aggiungi singola entità
// - Importa da CSV
// - Scarica template CSV
<AddEntityDropdown
  options={addOptions}
  onSelect={handleAddAction}
/>
```

### Filtri e Ricerca

```typescript
// Configurazione filtri
filterOptions={[
  {
    label: 'Stato',
    value: 'status',
    options: [
      { label: 'Attivo', value: 'active' },
      { label: 'Inattivo', value: 'inactive' }
    ]
  }
]}

// Configurazione ordinamento
sortOptions={[
  { label: 'Nome (A-Z)', value: 'name-asc' },
  { label: 'Nome (Z-A)', value: 'name-desc' }
]}
```

### Operazioni Batch

```typescript
// Azioni batch personalizzate
batchActions={[
  {
    label: 'Attiva selezionati',
    value: 'activate',
    variant: 'default',
    requiresConfirmation: true
  },
  {
    label: 'Elimina selezionati',
    value: 'delete',
    variant: 'destructive',
    requiresConfirmation: true
  }
]}

// Handler per azioni batch
const handleBatchAction = async (action: string, selectedIds: string[]) => {
  switch (action) {
    case 'activate':
      await batchActivate(selectedIds);
      break;
    case 'delete':
      await batchDelete(selectedIds);
      break;
  }
};
```

## Configurazione Vista Griglia

```typescript
cardConfig={{
  titleField: 'name',
  subtitleField: 'category',
  badgeField: 'status',
  descriptionField: 'description',
  additionalFields: [
    {
      key: 'email',
      label: 'Email',
      icon: <Mail className="h-3.5 w-3.5" />
    },
    {
      key: 'phone',
      label: 'Telefono',
      icon: <Phone className="h-3.5 w-3.5" />
    }
  ]
}}
```

## Import/Export CSV

### Configurazione CSV

```typescript
csvConfig={{
  headers: [
    { key: 'name', label: 'Nome' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Stato' }
  ],
  template: [
    { name: 'Esempio Nome', email: 'esempio@email.com', status: 'active' }
  ],
  filename: 'my-entities'
}}
```

### Handler Personalizzati

```typescript
const handleImport = async (data: any[]) => {
  // Validazione dati
  const validatedData = data.map(item => ({
    ...item,
    email: item.email?.toLowerCase(),
    status: item.status || 'active'
  }));
  
  // Import
  await importEntities(validatedData);
};

const handleExport = (entities: MyEntity[]) => {
  // Formattazione dati per export
  const formattedData = entities.map(entity => ({
    ...entity,
    created_at: new Date(entity.created_at).toLocaleDateString()
  }));
  
  exportToCsv(formattedData, headers, 'export.csv');
};
```

## Sistema di Permessi

### Configurazione Permessi

```typescript
// Permessi base
readPermission="entities.read"
writePermission="entities.write"
deletePermission="entities.delete"
exportPermission="entities.export"

// Il template gestisce automaticamente:
// - Visibilità pulsanti
// - Abilitazione funzioni
// - Controlli di accesso
```

### Controlli Automatici

- ✅ Pulsante "Aggiungi" visibile solo con permesso `write`
- ✅ Azioni "Modifica" visibili solo con permesso `write`
- ✅ Azioni "Elimina" visibili solo con permesso `delete`
- ✅ Export CSV disponibile solo con permesso `export`
- ✅ Import CSV disponibile solo con permesso `write`

## Conformità GDPR

### Funzionalità GDPR Integrate

1. **Controllo Accessi**
   - Permessi granulari per ogni operazione
   - Audit trail automatico

2. **Gestione Dati**
   - Validazione input
   - Sanitizzazione dati
   - Controllo esportazione

3. **Privacy by Design**
   - Minimizzazione dati
   - Pseudonimizzazione automatica
   - Controlli di retention

4. **Diritti dell'Interessato**
   - Export dati personali
   - Cancellazione sicura
   - Rettifica dati

## Esempi Completi

Vedi i file nella cartella `examples/` per implementazioni complete:

- **CompaniesPageExample.tsx**: Gestione aziende con permessi e validazioni
- **CoursesPageExample.tsx**: Gestione corsi con UI avanzata e azioni batch

## Best Practices

### 1. Configurazione

```typescript
// ✅ Usa configurazioni predefinite quando possibile
<GDPREntityTemplate {...companiesConfig} />

// ✅ Estendi configurazioni esistenti
<GDPREntityTemplate 
  {...companiesConfig}
  columns={customColumns}
  onCreateEntity={customHandler}
/>
```

### 2. Permessi

```typescript
// ✅ Definisci permessi specifici
readPermission="companies.view"
writePermission="companies.manage"
deletePermission="companies.remove"

// ❌ Non usare permessi generici
readPermission="admin"
```

### 3. Colonne

```typescript
// ✅ Usa renderCell per logica complessa
renderCell: (entity) => (
  <Badge variant={getStatusVariant(entity.status)}>
    {entity.status}
  </Badge>
)

// ✅ Specifica larghezze per layout consistente
width: 200
```

### 4. Handler

```typescript
// ✅ Gestisci errori appropriatamente
const handleDelete = async (id: string) => {
  try {
    await deleteEntity(id);
    toast.success('Entità eliminata con successo');
  } catch (error) {
    toast.error('Errore durante l\'eliminazione');
  }
};
```

## Troubleshooting

### Problemi Comuni

1. **Colonne non visualizzate**
   - Verifica che `key` corrisponda ai campi dell'entità
   - Controlla che `renderCell` non restituisca `undefined`

2. **Permessi non funzionanti**
   - Verifica configurazione `useAuth`
   - Controlla che i permessi siano definiti nel sistema

3. **Import CSV fallisce**
   - Verifica formato headers CSV
   - Controlla validazione dati nel handler

4. **Performance lente**
   - Usa `React.memo` per componenti pesanti
   - Implementa paginazione lato server
   - Ottimizza `renderCell` per colonne complesse

### Debug

```typescript
// Abilita debug mode
<GDPREntityTemplate
  {...config}
  debug={true} // Mostra log dettagliati
/>
```

## Roadmap

- [ ] Supporto filtri avanzati con date range
- [ ] Integrazione con sistema di notifiche
- [ ] Export in formati multipli (Excel, PDF)
- [ ] Supporto per campi personalizzati dinamici
- [ ] Integrazione con workflow di approvazione
- [ ] Supporto per entità annidate
- [ ] Cache intelligente per performance
- [ ] Supporto offline con sincronizzazione

## Contribuire

Per contribuire al template:

1. Segui le convenzioni di codice esistenti
2. Aggiungi test per nuove funzionalità
3. Aggiorna la documentazione
4. Testa la conformità GDPR
5. Verifica la compatibilità con tutte le configurazioni

---

**Nota**: Questo template è progettato per essere conforme al GDPR. Assicurati di rivedere e testare tutte le implementazioni per garantire la conformità alle normative specifiche del tuo caso d'uso.