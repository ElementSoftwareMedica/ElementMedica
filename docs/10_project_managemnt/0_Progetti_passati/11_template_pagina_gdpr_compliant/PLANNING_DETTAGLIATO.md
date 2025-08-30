# 📋 PLANNING DETTAGLIATO - Template Pagina GDPR-Compliant

**Versione:** 1.0  
**Data:** 30 Dicembre 2024  
**Stato:** In Sviluppo  

## 🎯 Obiettivo

Creare un template di pagina moderno e GDPR-compliant che replichi esattamente la struttura e il layout della pagina CoursesPage, utilizzando componenti riutilizzabili del design system esistente.

## 📊 Risultati Analisi

### ✅ Template Esistenti da Rimuovere
**Risultato**: Nessun template di pagina esistente trovato da rimuovere.
- Non esistono cartelle `/src/templates/` o `/src/page-templates/`
- I template esistenti sono solo per documenti (Templates.tsx per gestione template Google Docs)
- Possiamo procedere con implementazione pulita

### 🏗️ Componenti Riutilizzabili Identificati

Dalla analisi di CoursesPage, abbiamo identificato questi componenti chiave:

#### 1. Layout Components
- `EntityListLayout` - Layout principale della pagina
- `PageHeader` - Header con titolo e sottotitolo
- `SearchBar` - Barra di ricerca con filtri
- `FilterPanel` - Pannello filtri avanzati

#### 2. UI Components
- `ViewModeToggle` - Toggle vista tabella/griglia
- `AddEntityDropdown` - Dropdown per aggiungere entità
- `ColumnSelector` - Selettore colonne tabella
- `BatchEditButton` - Pulsante operazioni batch
- `DataTable` - Tabella dati principale
- `EntityCard` - Card per vista griglia

#### 3. Action Components
- `ActionButton` - Pulsanti azioni
- `ConfirmDialog` - Dialog conferma
- `Toast` - Notifiche
- `Modal` - Modali generici

## 🏗️ Architettura Template

### Struttura File Proposta
```
/src/templates/gdpr-entity-page/
├── index.ts                       # Export principale
├── GDPREntityPageTemplate.tsx     # Template principale
├── types/
│   ├── template.types.ts          # Tipi template
│   ├── gdpr.types.ts             # Tipi GDPR
│   └── entity.types.ts           # Tipi entità generici
├── hooks/
│   ├── useGDPREntityPage.ts      # Hook principale
│   ├── useGDPRAudit.ts           # Hook audit
│   ├── useGDPRConsent.ts         # Hook consensi
│   ├── useEntityCRUD.ts          # Hook CRUD operations
│   ├── useEntityFilters.ts       # Hook filtri
│   └── useEntitySearch.ts        # Hook ricerca
├── components/
│   ├── GDPREntityHeader.tsx      # Header GDPR-aware
│   ├── GDPREntitySearchBar.tsx   # SearchBar con audit
│   ├── GDPREntityTable.tsx       # Tabella protetta
│   ├── GDPREntityCard.tsx        # Card view protetta
│   ├── GDPRActionButton.tsx      # Pulsanti con logging
│   └── GDPRConsentModal.tsx      # Modal consensi
├── utils/
│   ├── gdprHelpers.ts            # Utility GDPR
│   ├── auditLogger.ts            # Logger centralizzato
│   ├── dataMinimizer.ts          # Minimizzazione dati
│   └── consentManager.ts         # Gestione consensi
└── config/
    ├── defaultConfig.ts          # Configurazione default
    └── gdprConfig.ts             # Configurazione GDPR
```

## 📋 Piano di Implementazione

### 🔄 Fase 1: Setup Struttura Base (30 min)

#### 1.1 Creazione Struttura Directory
- [ ] Creare `/src/templates/gdpr-entity-page/`
- [ ] Creare sottocartelle: `types/`, `hooks/`, `components/`, `utils/`, `config/`
- [ ] Creare file `index.ts` principale

#### 1.2 Definizione Tipi Base
- [ ] `types/entity.types.ts` - Tipi entità generici
- [ ] `types/gdpr.types.ts` - Tipi GDPR specifici
- [ ] `types/template.types.ts` - Tipi configurazione template

#### 1.3 Configurazione Base
- [ ] `config/defaultConfig.ts` - Configurazione default template
- [ ] `config/gdprConfig.ts` - Configurazione GDPR

### 🔄 Fase 2: Core Template Implementation (45 min)

#### 2.1 Template Principale
- [ ] `GDPREntityPageTemplate.tsx` - Componente template principale
- [ ] Replicare esatta struttura CoursesPage
- [ ] Integrare EntityListLayout
- [ ] Implementare configurazione dinamica

#### 2.2 Hook Principale
- [ ] `hooks/useGDPREntityPage.ts` - Hook principale per gestione stato
- [ ] Gestione stato entità
- [ ] Gestione filtri e ricerca
- [ ] Gestione selezione e operazioni batch

#### 2.3 Utility GDPR Base
- [ ] `utils/gdprHelpers.ts` - Utility helper GDPR
- [ ] `utils/auditLogger.ts` - Logger audit trail
- [ ] `utils/dataMinimizer.ts` - Minimizzazione dati

### 🔄 Fase 3: Componenti GDPR Specializzati (60 min)

#### 3.1 Header GDPR-Aware
- [ ] `components/GDPREntityHeader.tsx`
- [ ] Replicare layout header CoursesPage
- [ ] Integrare audit logging per azioni
- [ ] Gestione permessi GDPR

#### 3.2 SearchBar con Audit
- [ ] `components/GDPREntitySearchBar.tsx`
- [ ] Estendere SearchBar esistente
- [ ] Logging ricerche per audit
- [ ] Filtri GDPR-compliant

#### 3.3 Tabella Protetta
- [ ] `components/GDPREntityTable.tsx`
- [ ] Estendere DataTable esistente
- [ ] Data minimization automatica
- [ ] Controllo accesso colonne sensibili

#### 3.4 Action Button GDPR
- [ ] `components/GDPRActionButton.tsx`
- [ ] Estendere ActionButton esistente
- [ ] Audit logging automatico
- [ ] Verifica consensi prima azioni

### 🔄 Fase 4: Funzionalità GDPR Avanzate (45 min)

#### 4.1 Gestione Consensi
- [ ] `hooks/useGDPRConsent.ts` - Hook gestione consensi
- [ ] `components/GDPRConsentModal.tsx` - Modal consensi
- [ ] `utils/consentManager.ts` - Manager consensi

#### 4.2 Audit Trail Completo
- [ ] `hooks/useGDPRAudit.ts` - Hook audit avanzato
- [ ] Logging automatico tutte le operazioni
- [ ] Tracciamento modifiche dati

#### 4.3 CRUD Operations GDPR
- [ ] `hooks/useEntityCRUD.ts` - Hook CRUD con GDPR
- [ ] Verifica consensi pre-operazione
- [ ] Audit logging post-operazione
- [ ] Soft delete GDPR-compliant

### 🔄 Fase 5: Testing e Documentazione (30 min)

#### 5.1 Testing Funzionalità
- [ ] Test template con entità di esempio
- [ ] Verifica layout identico a CoursesPage
- [ ] Test funzionalità GDPR

#### 5.2 Documentazione
- [ ] README.md template
- [ ] Esempi di utilizzo
- [ ] Guida configurazione

#### 5.3 Esempio Implementazione
- [ ] Creare pagina di esempio
- [ ] Configurazione completa
- [ ] Test end-to-end

## 🔧 Dettagli Implementazione

### Template Configuration Interface

```typescript
interface GDPREntityPageConfig<T = any> {
  // Configurazione base
  entityName: string;
  entityNamePlural: string;
  subtitle: string;
  description: string;
  
  // Configurazione GDPR
  gdpr: {
    requiresConsent: boolean;
    auditLevel: 'minimal' | 'standard' | 'comprehensive';
    dataRetentionDays: number;
    sensitiveFields: (keyof T)[];
    anonymizationFields: (keyof T)[];
    encryptedFields: (keyof T)[];
  };
  
  // Configurazione UI (replica CoursesPage)
  ui: {
    hasViewModeToggle: boolean;
    hasImportExport: boolean;
    hasBatchOperations: boolean;
    hasAdvancedFilters: boolean;
    defaultViewMode: 'table' | 'grid';
    pageSize: number;
  };
  
  // Configurazione permessi
  permissions: {
    create: string[];
    read: string[];
    update: string[];
    delete: string[];
    export: string[];
    import: string[];
  };
  
  // Configurazione colonne (come CoursesPage)
  columns: EntityColumn<T>[];
  
  // Configurazione filtri
  filters: EntityFilter<T>[];
  
  // Azioni disponibili
  actions: EntityAction<T>[];
  
  // API endpoints
  api: {
    baseUrl: string;
    endpoints: {
      list: string;
      create: string;
      update: string;
      delete: string;
      export: string;
      import: string;
    };
  };
}
```

### Layout Structure (Replica Esatta CoursesPage)

```typescript
const GDPREntityPageTemplate = <T,>({
  config
}: GDPREntityPageTemplateProps<T>) => {
  // Hook principale
  const {
    entities,
    loading,
    searchTerm,
    setSearchTerm,
    selectedIds,
    setSelectedIds,
    // ... altri stati
  } = useGDPREntityPage(config);

  // Header content (identico a CoursesPage)
  const headerContent = (
    <div className="flex flex-wrap items-center justify-between mb-4">
      <div>
        <p className="text-gray-500">{config.description}</p>
      </div>
      
      <div className="flex items-center space-x-3">
        <ViewModeToggle
          viewMode={viewMode}
          onChange={(mode) => setViewMode(mode)}
          gridLabel="Griglia"
          tableLabel="Tabella"
        />
        
        <AddEntityDropdown
          label={`Aggiungi ${config.entityName}`}
          options={addOptions}
          icon={<Plus className="h-4 w-4" />}
          variant="primary"
        />
      </div>
    </div>
  );

  // Search bar content (identico a CoursesPage)
  const searchBarContent = (
    <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:items-center md:justify-between mb-6">
      <div className="w-full md:max-w-xs">
        <GDPREntitySearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={`Cerca ${config.entityNamePlural.toLowerCase()}...`}
          className="h-10"
          onFilterClick={() => {}} 
          filtersActive={Object.keys(activeFilters).length > 0}
          auditConfig={config.gdpr}
        />
      </div>
      
      <div className="flex items-center gap-2">
        <FilterPanel 
          filterOptions={config.filters}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          sortOptions={[]}
          activeSort={activeSort}
          onSortChange={setActiveSort}
        />
        
        <ColumnSelector
          columns={config.columns.map(col => ({
            key: col.key,
            label: col.label,
            required: col.key === 'actions' || col.required
          }))}
          hiddenColumns={hiddenColumns}
          onChange={handleColumnVisibilityChange}
          onOrderChange={handleColumnOrderChange}
          columnOrder={columnOrder}
          buttonClassName="h-10"
        />
        
        <BatchEditButton
          selectionMode={selectionMode}
          onToggleSelectionMode={() => setSelectionMode(!selectionMode)}
          selectedCount={selectedIds.length}
          className="h-10"
        />
      </div>
    </div>
  );

  return (
    <EntityListLayout 
      title={config.entityNamePlural}
      subtitle={config.subtitle}
      headerContent={headerContent}
      searchBarContent={searchBarContent}
    >
      {viewMode === 'table' ? (
        <GDPREntityTable
          entities={filteredEntities}
          columns={config.columns}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          gdprConfig={config.gdpr}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEntities.map((entity) => (
            <GDPREntityCard
              key={entity.id}
              entity={entity}
              gdprConfig={config.gdpr}
              onEdit={handleEdit}
              onDelete={handleDelete}
              selected={selectedIds.includes(entity.id)}
              onSelectionChange={(selected) => {
                if (selected) {
                  setSelectedIds([...selectedIds, entity.id]);
                } else {
                  setSelectedIds(selectedIds.filter(id => id !== entity.id));
                }
              }}
            />
          ))}
        </div>
      )}
    </EntityListLayout>
  );
};
```

### GDPR Features Implementation

#### 1. Audit Logging Automatico
```typescript
const useGDPRAudit = (config: GDPRConfig) => {
  const logAction = async (action: GDPRAction, data: any) => {
    if (config.auditLevel === 'minimal' && !['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
      return;
    }
    
    await auditLogger.log({
      action,
      entityType: config.entityName,
      entityId: data.id,
      userId: currentUser.id,
      timestamp: new Date(),
      ipAddress: getClientIP(),
      userAgent: navigator.userAgent,
      changes: data.changes,
      reason: data.reason
    });
  };
  
  return { logAction };
};
```

#### 2. Data Minimization
```typescript
const useDataMinimizer = (config: GDPRConfig) => {
  const minimizeData = (entity: any, userRole: string) => {
    const minimized = { ...entity };
    
    config.sensitiveFields.forEach(field => {
      if (!hasPermission(userRole, 'view_sensitive', field)) {
        minimized[field] = '***PROTECTED***';
      }
    });
    
    return minimized;
  };
  
  return { minimizeData };
};
```

#### 3. Consent Management
```typescript
const useGDPRConsent = (config: GDPRConfig) => {
  const checkConsent = async (operation: string) => {
    if (!config.requiresConsent) return true;
    
    const consent = await consentManager.getConsent(
      currentUser.id,
      config.entityName,
      operation
    );
    
    if (!consent?.granted) {
      throw new Error(`Consenso GDPR richiesto per ${operation}`);
    }
    
    return true;
  };
  
  return { checkConsent };
};
```

## 📊 Metriche di Successo

### ✅ Funzionalità Core
- [ ] Layout identico al 100% a CoursesPage
- [ ] Tutti i componenti riutilizzabili integrati
- [ ] Configurazione flessibile e modulare
- [ ] Performance < 2s caricamento iniziale

### ✅ GDPR Compliance
- [ ] Audit trail completo implementato
- [ ] Gestione consensi funzionante
- [ ] Data minimization applicata
- [ ] Right to be forgotten implementato
- [ ] Conformità 100% ai requisiti GDPR

### ✅ Developer Experience
- [ ] Documentazione completa
- [ ] Esempi di utilizzo chiari
- [ ] TypeScript support completo
- [ ] Configurazione intuitiva
- [ ] Template riutilizzabile per nuove pagine

## 🚀 Utilizzo Template

### Esempio Configurazione
```typescript
// Esempio: Pagina Dipendenti GDPR-Compliant
const employeesConfig: GDPREntityPageConfig<Employee> = {
  entityName: 'Dipendente',
  entityNamePlural: 'Dipendenti',
  subtitle: 'Gestisci i dipendenti aziendali',
  description: 'Visualizza, modifica e gestisci i dipendenti nel rispetto del GDPR.',
  
  gdpr: {
    requiresConsent: true,
    auditLevel: 'comprehensive',
    dataRetentionDays: 2555, // 7 anni
    sensitiveFields: ['email', 'phone', 'address', 'fiscalCode'],
    anonymizationFields: ['firstName', 'lastName'],
    encryptedFields: ['fiscalCode', 'bankAccount']
  },
  
  ui: {
    hasViewModeToggle: true,
    hasImportExport: true,
    hasBatchOperations: true,
    hasAdvancedFilters: true,
    defaultViewMode: 'table',
    pageSize: 25
  },
  
  permissions: {
    create: ['ADMIN', 'HR_MANAGER'],
    read: ['ADMIN', 'HR_MANAGER', 'HR_OPERATOR'],
    update: ['ADMIN', 'HR_MANAGER'],
    delete: ['ADMIN'],
    export: ['ADMIN', 'HR_MANAGER'],
    import: ['ADMIN']
  },
  
  columns: [
    { key: 'firstName', label: 'Nome', sortable: true },
    { key: 'lastName', label: 'Cognome', sortable: true },
    { key: 'email', label: 'Email', sortable: true, sensitive: true },
    { key: 'department', label: 'Dipartimento', sortable: true },
    { key: 'role', label: 'Ruolo', sortable: true },
    { key: 'status', label: 'Stato', sortable: true },
    { key: 'actions', label: 'Azioni', required: true }
  ],
  
  filters: [
    { key: 'department', label: 'Dipartimento', type: 'select' },
    { key: 'status', label: 'Stato', type: 'select' },
    { key: 'role', label: 'Ruolo', type: 'select' }
  ],
  
  actions: [
    { key: 'edit', label: 'Modifica', icon: 'Edit' },
    { key: 'delete', label: 'Elimina', icon: 'Trash', requiresConfirm: true },
    { key: 'export', label: 'Esporta', icon: 'Download' }
  ],
  
  api: {
    baseUrl: '/api',
    endpoints: {
      list: '/employees',
      create: '/employees',
      update: '/employees',
      delete: '/employees',
      export: '/employees/export',
      import: '/employees/import'
    }
  }
};

// Utilizzo del template
const EmployeesPage = () => {
  return (
    <GDPREntityPageTemplate config={employeesConfig} />
  );
};
```

## 📅 Timeline

**Tempo Totale Stimato**: 3.5 ore

- **Fase 1**: 30 minuti (Setup)
- **Fase 2**: 45 minuti (Core Template)
- **Fase 3**: 60 minuti (Componenti GDPR)
- **Fase 4**: 45 minuti (Funzionalità Avanzate)
- **Fase 5**: 30 minuti (Testing e Documentazione)

**Milestone**:
- ✅ **Ora 1**: Struttura base e tipi completati
- ✅ **Ora 2**: Template principale funzionante
- ✅ **Ora 3**: Componenti GDPR implementati
- ✅ **Ora 3.5**: Testing completato e documentazione pronta

---

**Prossimo Step**: Iniziare Fase 1 - Setup Struttura Base