# 📊 Sistema Template GDPR Unificato

**Versione**: 2.0 Post-Refactoring  
**Data**: 25 Gennaio 2025  
**Sistema**: Template Unificato basato su Companies Page

## 🎯 Panoramica

Il `GDPREntityTemplate` è un sistema di template unificato che fornisce una soluzione completa per la gestione di entità con conformità GDPR integrata. Basato sui pattern estratti dalla pagina Companies, offre un'interfaccia standardizzata per tutte le entità del sistema.

## 🏗️ Architettura Template

### Componenti Principali

1. **GDPREntityTemplate** (`/src/templates/gdpr-entity-page/GDPREntityTemplate.tsx`)
   - Template principale unificato
   - Gestione permessi basata su ruoli
   - Conformità GDPR automatica
   - UI moderna con componenti riutilizzabili

2. **Componenti UI Integrati**
   - `ViewModeToggle` - Toggle vista tabella/griglia
   - `AddEntityDropdown` - Dropdown per aggiungere entità
   - `FilterPanel` - Pannello filtri avanzati
   - `ColumnSelector` - Selettore colonne tabella
   - `BatchEditButton` - Operazioni batch
   - `SearchBar` - Ricerca avanzata

3. **Sistema di Permessi**
   - `readPermission` - Lettura entità
   - `writePermission` - Creazione/modifica
   - `deletePermission` - Eliminazione
   - `exportPermission` - Esportazione dati

## 🚀 Implementazione

### Configurazione Base

```typescript
import { GDPREntityTemplate } from '../../templates/gdpr-entity-page/GDPREntityTemplate';

export default function EntityPage() {
  return (
    <GDPREntityTemplate<EntityType>
      entityName="entity"
      entityNamePlural="entities"
      entityDisplayName="Entità"
      entityDisplayNamePlural="Entità"
      readPermission="entities:read"
      writePermission="entities:write"
      deletePermission="entities:delete"
      exportPermission="entities:export"
      apiEndpoint="/entities"
      columns={getEntityColumns()}
      searchFields={['name', 'description']}
      filterOptions={filterOptions}
      sortOptions={sortOptions}
      csvHeaders={csvHeaders}
      csvTemplateData={csvTemplateData}
      cardConfig={getEntityCardConfig()}
      enableBatchOperations={true}
      enableImportExport={true}
      enableColumnSelector={true}
      enableAdvancedFilters={true}
      defaultViewMode="table"
      pageSize={10}
    />
  );
}
```

### Configurazione Colonne

```typescript
const getEntityColumns = (): DataTableColumn<EntityType>[] => [
  {
    key: 'name',
    label: 'Nome',
    sortable: true,
    renderCell: (entity) => (
      <div className="font-medium">{entity.name}</div>
    )
  },
  // ... altre colonne
];
```

## 🛡️ Conformità GDPR

### Funzionalità Automatiche

- **Audit Trail**: Tracciamento automatico delle modifiche
- **Data Export**: Esportazione dati in formato CSV
- **Permission Control**: Controllo granulare degli accessi
- **Data Retention**: Gestione automatica della ritenzione dati
- **Consent Management**: Gestione consensi integrata

### Regole di Implementazione

1. **Obbligatorio** utilizzare `GDPREntityTemplate` per nuove pagine entità
2. **Vietato** creare pagine entità custom senza il template
3. **Obbligatorio** implementare tutti i permessi richiesti
4. **Raccomandato** utilizzare i componenti UI standardizzati

## 📋 Pagine Implementate

### ✅ Completate
- **Companies** - Pagina di riferimento
- **Courses** - Migrata al template unificato
- **Templates** - Sistema template management (Phase 4)
- **Documents** - Gestione documenti generati (Phase 4)
- **Lettere Incarico** - Integrazione template system (Phase 5.1)

### 🔄 In Migrazione
- **Employees** - Parzialmente migrata
- **Schedules** - Da migrare

## 🎯 Document Types Integration (Phase 5)

### Phase 5.1: Lettere Incarico ✅ COMPLETE
**API Routes**: `/api/v1/lettere-incarico/*`
- GET / - List lettere con filtri (scheduleId, trainerId)
- GET /:id - Get singola lettera
- POST /generate - Genera lettera da template
- POST /generate-batch - Batch generation per trainers
- DELETE /:id - Soft delete
- GET /:id/download - Download PDF

**Frontend Components**:
- `GenerateLetterDialog.tsx` - Dialog generazione lettere
- `ScheduleLettersCard.tsx` - Card gestione lettere in schedule
- `lettereIncaricoService.ts` - Service layer

**Default Template**: 25 markers (tenant.*, trainer.*, course.*, schedule.*, document.*, current.*)

**Conformità**:
- ✅ Tenant isolation (tenantId)
- ✅ Soft delete (deletedAt)
- ✅ Authentication & Authorization
- ✅ Audit logging
- ✅ Progressive numbering (numeroProgressivo/annoProgressivo)

### Phase 5.2: Registri Presenze 🔄 PLANNED
- Template landscape per tabelle presenze
- API routes per registri
- UI per tracking sessioni

### Phase 5.3: Attestati 🔄 PLANNED
- Migrazione attestati esistenti
- Batch generation
- Email delivery integration

## 🔧 Troubleshooting

### Problemi Comuni

1. **Permessi non funzionanti**
   - Verificare configurazione `useAuth`
   - Controllare definizione permessi nel sistema

2. **Colonne non visualizzate**
   - Verificare che `key` corrisponda ai campi dell'entità
   - Controllare che `renderCell` non restituisca `undefined`

3. **Import/Export non funziona**
   - Verificare configurazione `csvHeaders` e `csvTemplateData`
   - Controllare permessi di esportazione

### Diagnostica

```bash
# Verifica stato template
curl http://localhost:4001/api/health

# Test permessi utente
curl -H "Authorization: Bearer <token>" http://localhost:4001/api/user/permissions
```

## 📞 Supporto

Per problemi con il template system:
1. Consultare [troubleshooting](../troubleshooting/)
2. Verificare implementazione pagina Companies come riferimento
3. Controllare logs del sistema per errori specifici