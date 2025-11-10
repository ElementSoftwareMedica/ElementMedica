# 📋 DocumentManager Extraction Strategy

**Component**: `src/components/schedules/components/DocumentManager.tsx`  
**Size**: 761 lines (God Component)  
**Target**: ~250 lines main component (-67%)  
**Analysis Date**: 10 Novembre 2025  
**Phase**: 3.6 (God Components Elimination)

---

## 📊 COMPONENT ANALYSIS

### Current Structure
- **Total Lines**: 761L
- **Imports**: 14 services/components
- **Props**: 17 props (complex interface)
- **State Variables**: 11 useState hooks
- **Effects**: 1 useEffect (document fetching)
- **Event Handlers**: 9 handlers (generate, delete operations)
- **UI Sections**: 5 major sections (status, summary, 4 document types)

### Complexity Breakdown

**State Management** (11 state variables, ~40L):
```typescript
- loadingLettere, loadingRegistri, loadingAttestati (3 loading states)
- lettereList, registriList, attestatiList, preventiviList (4 data lists)
- refreshKey, showRegenerateModal, showPreventiviModal, editingPreventivo (4 UI states)
```

**Data Fetching** (~80L):
- fetchDocuments() - Main fetch with Promise.all
- fetchPendingPreventivi() - Fetch preventivi by IDs
- useEffect for auto-refresh on scheduleId/refreshKey changes

**Document Generation** (~200L):
- handleGenerateLettere() - Batch generation lettere incarico
- handleGenerateRegistri() - Loop generation registri presenze
- handleGenerateAttestati() - Batch generation with modal
- handleConfirmGeneration() - Attestati with regenerate logic

**Document Deletion** (~60L):
- handleDeleteLettera()
- handleDeleteRegistro()
- handleDeleteAttestato()

**UI Rendering** (~380L):
- Header with status and refresh button
- Status dropdown menu
- Summary cards (3 cards)
- 4 document sections (Lettere, Registri, Attestati, Preventivi)
  - Each section: ~80-100L
  - Generation button
  - Document list with download/edit/delete actions
- Status information footer
- 2 modals (RegenerateAttestatiModal, PreventiviModal)

---

## 🎯 EXTRACTION STRATEGY

### Target Architecture

```
DocumentManager/
├── types.ts (150L)
├── hooks/
│   ├── useDocumentData.ts (120L)
│   ├── useDocumentGeneration.ts (140L)
│   ├── useDocumentActions.ts (80L)
│   └── useDocumentUI.ts (60L)
├── components/
│   ├── DocumentStatusSelector.tsx (60L)
│   ├── DocumentSummaryCards.tsx (50L)
│   ├── DocumentSection.tsx (120L) - Reusable per ogni tipo
│   ├── DocumentList.tsx (80L)
│   └── DocumentItem.tsx (60L)
├── utils/
│   ├── documentHelpers.ts (70L)
│   └── documentValidators.ts (50L)
└── DocumentManager.tsx (250L)
```

**Total Estimated**: 250L main + 1,040L modules = 1,290L (+69% code for clarity & reusability)

---

## 📦 PHASE 1: Types Extraction (types.ts - 150L)

### Interfaces to Extract

```typescript
// Document Types
export interface LetteraIncarico { /* from service */ }
export interface RegistroPresenze { /* from service */ }
export interface Attestato { /* from service */ }
export interface Preventivo { /* from service */ }

// Component Props
export interface DocumentManagerProps {
  status: string;
  onStatusChange: (status: string) => void;
  selectedPersons: (string | number)[];
  selectedCompanies: (string | number)[];
  attendance: Record<number, (string | number)[]>;
  dates: DateEntry[];
  showStatusMenu: boolean;
  onShowStatusMenuChange: (show: boolean) => void;
  scheduleId?: string | number | null;
  trainers?: Array<{ id: string | number; firstName: string; lastName: string }>;
  persons?: Person[];
  selectedCourse?: Training;
  companies?: Company[];
  pendingPreventiviIds?: string[];
  onPendingPreventiviCreated?: (ids: string[]) => void;
}

// Internal Types
export type DateEntry = import('../types').ScheduleDateEntry;
export type Person = { id: string | number; firstName: string; lastName: string };
export type Training = { id: string | number; name?: string; nome?: string; title?: string; price?: number; prezzo?: number; };
export type Company = { id: string | number; ragioneSociale?: string; businessName?: string; };

// State Types
export interface DocumentState {
  lettereList: LetteraIncarico[];
  registriList: RegistroPresenze[];
  attestatiList: Attestato[];
  preventiviList: any[];
}

export interface LoadingState {
  lettere: boolean;
  registri: boolean;
  attestati: boolean;
}

export interface UIState {
  refreshKey: number;
  showRegenerateModal: boolean;
  showPreventiviModal: boolean;
  editingPreventivo: any | null;
}

// Document Type Enum
export enum DocumentType {
  LETTERA_INCARICO = 'LETTERA_INCARICO',
  REGISTRO_PRESENZE = 'REGISTRO_PRESENZE',
  ATTESTATO = 'ATTESTATO',
  PREVENTIVO = 'PREVENTIVO'
}

// Generation Options
export interface GenerationOptions {
  scheduleId: string | number;
  sendEmail?: boolean;
}

export interface LettereGenerationOptions extends GenerationOptions {
  trainerIds: string[];
}

export interface RegistriGenerationOptions {
  sessionId: string;
  formatoreId: string;
  attendanceData: Array<{
    personId: string;
    present: boolean;
    hours: number;
  }>;
}

export interface AttestatiGenerationOptions extends GenerationOptions {
  personIds: string[];
}
```

---

## 🔧 PHASE 2: Utils Extraction

### documentHelpers.ts (70L)

```typescript
/**
 * Utility functions for document management
 */

/**
 * Check if schedule has all required data for document generation
 */
export const hasAttendanceData = (
  dates: DateEntry[], 
  attendance: Record<number, (string | number)[]>
): boolean => {
  return dates.every((_, idx) => 
    attendance[idx] && attendance[idx].length > 0
  );
};

/**
 * Get document status info (color, icon, description)
 */
export const getStatusInfo = (status: string) => {
  const statusMap = {
    'Preventivo': {
      color: 'blue',
      description: '📝 Il corso è in fase di preventivazione'
    },
    'Conferma': {
      color: 'green',
      description: '✅ Il corso è confermato e pronto per l\'erogazione'
    },
    'Fattura': {
      color: 'purple',
      description: '💰 Il corso è stato fatturato'
    },
    'Pagamento': {
      color: 'green',
      description: '✓ Il pagamento è stato ricevuto'
    }
  };
  return statusMap[status] || statusMap['Preventivo'];
};

/**
 * Get preventivo status badge color
 */
export const getPreventivoStatusColor = (stato: string): string => {
  if (stato === 'ACCETTATO') return 'bg-green-100 text-green-700';
  if (stato === 'INVIATO') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
};

/**
 * Format document number (progressive/year)
 */
export const formatDocumentNumber = (numero: number, anno: number): string => {
  return `#${numero}/${anno}`;
};

/**
 * Get document type icon component
 */
export const getDocumentTypeIcon = (type: DocumentType) => {
  // Returns icon component based on type
};

/**
 * Get document type color
 */
export const getDocumentTypeColor = (type: DocumentType): string => {
  const colors = {
    [DocumentType.LETTERA_INCARICO]: 'blue',
    [DocumentType.REGISTRO_PRESENZE]: 'purple',
    [DocumentType.ATTESTATO]: 'green',
    [DocumentType.PREVENTIVO]: 'orange'
  };
  return colors[type];
};
```

### documentValidators.ts (50L)

```typescript
/**
 * Validation functions for document generation
 */

/**
 * Validate can generate lettere incarico
 */
export const canGenerateLettere = (
  scheduleId: string | number | null,
  trainers: any[]
): boolean => {
  return Boolean(scheduleId) && trainers.length > 0;
};

/**
 * Validate can generate registri presenze
 */
export const canGenerateRegistri = (
  scheduleId: string | number | null,
  dates: any[]
): boolean => {
  return Boolean(scheduleId) && dates.length > 0;
};

/**
 * Validate can generate attestati
 */
export const canGenerateAttestati = (
  scheduleId: string | number | null,
  hasAttendance: boolean,
  selectedPersons: any[]
): boolean => {
  return Boolean(scheduleId) && hasAttendance && selectedPersons.length > 0;
};

/**
 * Validate can generate preventivi
 */
export const canGeneratePreventivi = (
  scheduleId: string | number | null,
  selectedCompanies: any[]
): boolean => {
  return Boolean(scheduleId) && selectedCompanies.length > 0;
};

/**
 * Get warning message if validation fails
 */
export const getValidationWarning = (
  type: DocumentType,
  context: any
): string | null => {
  // Returns appropriate warning message
};
```

---

## 🪝 PHASE 3: Hooks Extraction

### useDocumentData.ts (120L)

**Responsibility**: Data fetching, caching, refresh logic

```typescript
import { useState, useEffect } from 'react';
import { clearCache, invalidateCache } from '../../../services/api';
import lettereIncaricoService from '../../../services/lettereIncaricoService';
import registriPresenzeService from '../../../services/registriPresenzeService';
import attestatiService from '../../../services/attestatiService';
import preventiviService from '../../../services/preventiviService';
import type { DocumentState } from '../types';

export const useDocumentData = (
  scheduleId: string | number | null,
  pendingPreventiviIds: string[]
) => {
  const [documents, setDocuments] = useState<DocumentState>({
    lettereList: [],
    registriList: [],
    attestatiList: [],
    preventiviList: []
  });
  
  const [refreshKey, setRefreshKey] = useState(0);
  
  const fetchDocuments = async () => {
    if (!scheduleId) return;
    
    // CRITICAL: Clear cache before fetching
    clearCache();
    
    try {
      const [lettere, registri, attestati, preventivi] = await Promise.all([
        lettereIncaricoService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        registriPresenzeService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        attestatiService.list({ scheduleId: String(scheduleId) }).catch(() => []),
        preventiviService.list({ scheduleId: String(scheduleId) }).catch(() => [])
      ]);
      
      setDocuments({
        lettereList: lettere,
        registriList: registri,
        attestatiList: attestati,
        preventiviList: preventivi
      });
    } catch (error) {
      console.error('Errore caricamento documenti:', error);
    }
  };
  
  const fetchPendingPreventivi = async () => {
    // Implementation for pending preventivi
  };
  
  useEffect(() => {
    if (scheduleId) {
      fetchDocuments();
    } else if (pendingPreventiviIds.length > 0) {
      fetchPendingPreventivi();
    }
  }, [scheduleId, refreshKey, pendingPreventiviIds]);
  
  const refresh = () => setRefreshKey(prev => prev + 1);
  
  const invalidateDocumentCache = (type: DocumentType) => {
    // Invalidate specific cache
  };
  
  return {
    ...documents,
    refresh,
    invalidateDocumentCache
  };
};
```

### useDocumentGeneration.ts (140L)

**Responsibility**: Document generation logic (lettere, registri, attestati)

```typescript
import { useState } from 'react';
import type { LoadingState, LettereGenerationOptions, RegistriGenerationOptions, AttestatiGenerationOptions } from '../types';

export const useDocumentGeneration = (
  scheduleId: string | number | null,
  onRefresh: () => void
) => {
  const [loading, setLoading] = useState<LoadingState>({
    lettere: false,
    registri: false,
    attestati: false
  });
  
  const generateLettere = async (options: LettereGenerationOptions) => {
    setLoading(prev => ({ ...prev, lettere: true }));
    try {
      const result = await lettereIncaricoService.generateBatch(options);
      alert(`✅ ${result.message}`);
      invalidateCache('/api/v1/lettere-incarico');
      onRefresh();
    } catch (error: any) {
      alert(`❌ Errore: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, lettere: false }));
    }
  };
  
  const generateRegistri = async (dates, attendance, trainers) => {
    // Implementation for registri generation (loop through sessions)
  };
  
  const generateAttestati = async (options: AttestatiGenerationOptions, regenerate: boolean) => {
    // Implementation for attestati generation
  };
  
  return {
    loading,
    generateLettere,
    generateRegistri,
    generateAttestati
  };
};
```

### useDocumentActions.ts (80L)

**Responsibility**: Document actions (download, delete, edit)

```typescript
export const useDocumentActions = (onRefresh: () => void) => {
  const downloadDocument = async (service: any, id: string) => {
    try {
      await service.download(id);
    } catch (error) {
      alert('❌ Errore durante il download');
    }
  };
  
  const deleteDocument = async (service: any, id: string, type: string) => {
    if (!confirm(`Sei sicuro di voler eliminare questo ${type}?`)) return;
    try {
      await service.delete(id);
      onRefresh();
    } catch (error) {
      alert('❌ Errore durante l\'eliminazione');
    }
  };
  
  const downloadZipBatch = async (service: any, ids: string[]) => {
    try {
      await service.downloadZipBatch(ids);
    } catch (error) {
      alert('❌ Errore durante il download ZIP');
    }
  };
  
  return {
    downloadDocument,
    deleteDocument,
    downloadZipBatch
  };
};
```

### useDocumentUI.ts (60L)

**Responsibility**: UI state management (modals, menus)

```typescript
export const useDocumentUI = () => {
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showPreventiviModal, setShowPreventiviModal] = useState(false);
  const [editingPreventivo, setEditingPreventivo] = useState<any>(null);
  
  const openRegenerateModal = () => setShowRegenerateModal(true);
  const closeRegenerateModal = () => setShowRegenerateModal(false);
  
  const openPreventiviModal = (preventivo?: any) => {
    setEditingPreventivo(preventivo || null);
    setShowPreventiviModal(true);
  };
  
  const closePreventiviModal = () => {
    setShowPreventiviModal(false);
    setEditingPreventivo(null);
  };
  
  return {
    showRegenerateModal,
    showPreventiviModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal
  };
};
```

---

## 🎨 PHASE 4: Components Extraction

### DocumentStatusSelector.tsx (60L)

**Responsibility**: Status dropdown selector

```tsx
interface Props {
  status: string;
  statusOptions: string[];
  showMenu: boolean;
  onStatusChange: (status: string) => void;
  onShowMenuChange: (show: boolean) => void;
}

export const DocumentStatusSelector: React.FC<Props> = ({
  status,
  statusOptions,
  showMenu,
  onStatusChange,
  onShowMenuChange
}) => {
  return (
    <div>
      <Label>Stato Documentazione</Label>
      <div className="relative mt-1">
        <button onClick={() => onShowMenuChange(!showMenu)}>
          {status}
        </button>
        {showMenu && (
          <div className="dropdown">
            {statusOptions.map(s => (
              <div key={s} onClick={() => { onStatusChange(s); onShowMenuChange(false); }}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### DocumentSummaryCards.tsx (50L)

**Responsibility**: Display summary cards (participants, companies, sessions)

```tsx
interface Props {
  selectedPersons: number;
  selectedCompanies: number;
  dates: number;
}

export const DocumentSummaryCards: React.FC<Props> = ({
  selectedPersons,
  selectedCompanies,
  dates
}) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="card blue">
        <div className="label">Partecipanti</div>
        <div className="value">{selectedPersons}</div>
      </div>
      <div className="card purple">
        <div className="label">Aziende</div>
        <div className="value">{selectedCompanies}</div>
      </div>
      <div className="card green">
        <div className="label">Sessioni</div>
        <div className="value">{dates}</div>
      </div>
    </div>
  );
};
```

### DocumentSection.tsx (120L)

**Responsibility**: Reusable document section (generation + list)

```tsx
interface Props {
  type: DocumentType;
  title: string;
  description: string;
  icon: React.ComponentType;
  color: string;
  count: number;
  canGenerate: boolean;
  loading: boolean;
  warningMessage?: string;
  details?: React.ReactNode;
  onGenerate: () => void;
  documents: any[];
  onDownload: (id: string) => void;
  onEdit?: (doc: any) => void;
  onDelete: (id: string) => void;
  onDownloadZip?: () => void;
}

export const DocumentSection: React.FC<Props> = ({
  type,
  title,
  description,
  icon: Icon,
  color,
  count,
  canGenerate,
  loading,
  warningMessage,
  details,
  onGenerate,
  documents,
  onDownload,
  onEdit,
  onDelete,
  onDownloadZip
}) => {
  return (
    <div className={`section ${color}`}>
      {/* Header */}
      <div className="header">
        <div>
          <div className="title">
            <Icon />
            <h5>{title}</h5>
            {count > 0 && <span className="badge">{count} generati</span>}
          </div>
          <p>{description}</p>
          {details}
        </div>
        <button onClick={onGenerate} disabled={!canGenerate || loading}>
          {loading ? 'Generazione...' : `Genera ${title}`}
        </button>
      </div>
      
      {/* Warning */}
      {warningMessage && <div className="warning">{warningMessage}</div>}
      
      {/* Document List */}
      {documents.length > 0 && (
        <DocumentList
          documents={documents}
          color={color}
          onDownload={onDownload}
          onEdit={onEdit}
          onDelete={onDelete}
          onDownloadZip={onDownloadZip}
        />
      )}
    </div>
  );
};
```

### DocumentList.tsx (80L)

**Responsibility**: Display list of generated documents

```tsx
interface Props {
  documents: any[];
  color: string;
  onDownload: (id: string) => void;
  onEdit?: (doc: any) => void;
  onDelete: (id: string) => void;
  onDownloadZip?: () => void;
}

export const DocumentList: React.FC<Props> = ({
  documents,
  color,
  onDownload,
  onEdit,
  onDelete,
  onDownloadZip
}) => {
  return (
    <div className="document-list">
      <div className="header">
        <div className="label">Documenti generati:</div>
        {documents.length > 1 && onDownloadZip && (
          <button onClick={onDownloadZip}>
            Scarica tutto (ZIP)
          </button>
        )}
      </div>
      {documents.map(doc => (
        <DocumentItem
          key={doc.id}
          document={doc}
          color={color}
          onDownload={() => onDownload(doc.id)}
          onEdit={onEdit ? () => onEdit(doc) : undefined}
          onDelete={() => onDelete(doc.id)}
        />
      ))}
    </div>
  );
};
```

### DocumentItem.tsx (60L)

**Responsibility**: Single document item with actions

```tsx
interface Props {
  document: any;
  color: string;
  onDownload: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

export const DocumentItem: React.FC<Props> = ({
  document,
  color,
  onDownload,
  onEdit,
  onDelete
}) => {
  return (
    <div className="document-item">
      <div className="info">
        <Icon className={`icon ${color}`} />
        <span className="name">{document.name}</span>
        <span className="number">#{document.numero}/{document.anno}</span>
      </div>
      <div className="actions">
        <button onClick={onDownload} title="Scarica">
          <Download />
        </button>
        {onEdit && (
          <button onClick={onEdit} title="Modifica">
            <Edit />
          </button>
        )}
        <button onClick={onDelete} title="Elimina">
          <Trash2 />
        </button>
      </div>
    </div>
  );
};
```

---

## 🏗️ PHASE 5: Main Component Refactor (250L)

### DocumentManager.tsx (Refactored)

```typescript
import React from 'react';
import { useDocumentData } from './hooks/useDocumentData';
import { useDocumentGeneration } from './hooks/useDocumentGeneration';
import { useDocumentActions } from './hooks/useDocumentActions';
import { useDocumentUI } from './hooks/useDocumentUI';
import { DocumentStatusSelector } from './components/DocumentStatusSelector';
import { DocumentSummaryCards } from './components/DocumentSummaryCards';
import { DocumentSection } from './components/DocumentSection';
import { hasAttendanceData, getStatusInfo, getDocumentTypeColor } from './utils/documentHelpers';
import { canGenerateLettere, canGenerateRegistri, canGenerateAttestati, canGeneratePreventivi } from './utils/documentValidators';
import { FileText, Users, Award, Calculator } from 'lucide-react';
import { DocumentType } from './types';
import type { DocumentManagerProps } from './types';

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  status,
  onStatusChange,
  selectedPersons,
  selectedCompanies,
  attendance,
  dates,
  showStatusMenu,
  onShowStatusMenuChange,
  scheduleId,
  trainers = [],
  persons = [],
  selectedCourse,
  companies = [],
  pendingPreventiviIds = [],
  onPendingPreventiviCreated
}) => {
  const statusOptions = ['Preventivo', 'Conferma', 'Fattura', 'Pagamento'];
  
  // Hook 1: Data management
  const {
    lettereList,
    registriList,
    attestatiList,
    preventiviList,
    refresh,
    invalidateDocumentCache
  } = useDocumentData(scheduleId, pendingPreventiviIds);
  
  // Hook 2: Document generation
  const {
    loading,
    generateLettere,
    generateRegistri,
    generateAttestati
  } = useDocumentGeneration(scheduleId, refresh);
  
  // Hook 3: Document actions
  const {
    downloadDocument,
    deleteDocument,
    downloadZipBatch
  } = useDocumentActions(refresh);
  
  // Hook 4: UI state
  const {
    showRegenerateModal,
    showPreventiviModal,
    editingPreventivo,
    openRegenerateModal,
    closeRegenerateModal,
    openPreventiviModal,
    closePreventiviModal
  } = useDocumentUI();
  
  // Computed values
  const hasAttendance = hasAttendanceData(dates, attendance);
  const hasScheduleId = Boolean(scheduleId);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="header">
        <h3>📄 Gestione Documenti</h3>
        {hasScheduleId && <button onClick={refresh}>Aggiorna</button>}
      </div>
      
      <div className="container">
        {/* Status Selector */}
        <DocumentStatusSelector
          status={status}
          statusOptions={statusOptions}
          showMenu={showStatusMenu}
          onStatusChange={onStatusChange}
          onShowMenuChange={onShowStatusMenuChange}
        />
        
        {/* Summary Cards */}
        <DocumentSummaryCards
          selectedPersons={selectedPersons.length}
          selectedCompanies={selectedCompanies.length}
          dates={dates.length}
        />
        
        {/* Document Sections */}
        <div className="sections">
          {/* Lettere */}
          <DocumentSection
            type={DocumentType.LETTERA_INCARICO}
            title="Lettere di Incarico"
            description={`Genera ${trainers.length} lettera${trainers.length !== 1 ? 'e' : ''}`}
            icon={FileText}
            color="blue"
            count={lettereList.length}
            canGenerate={canGenerateLettere(scheduleId, trainers)}
            loading={loading.lettere}
            onGenerate={() => generateLettere({ scheduleId, trainerIds: trainers.map(t => String(t.id)) })}
            documents={lettereList}
            onDownload={(id) => downloadDocument(lettereIncaricoService, id)}
            onDelete={(id) => deleteDocument(lettereIncaricoService, id, 'lettera')}
          />
          
          {/* Registri */}
          <DocumentSection
            type={DocumentType.REGISTRO_PRESENZE}
            title="Registri Presenze"
            // ... similar structure
          />
          
          {/* Attestati */}
          <DocumentSection
            type={DocumentType.ATTESTATO}
            title="Attestati di Partecipazione"
            // ... similar structure
            onGenerate={openRegenerateModal}
          />
          
          {/* Preventivi */}
          <DocumentSection
            type={DocumentType.PREVENTIVO}
            title="Preventivi"
            // ... similar structure
            onGenerate={() => openPreventiviModal()}
            onEdit={(doc) => openPreventiviModal(doc)}
          />
        </div>
        
        {/* Status Info Footer */}
        <div className="status-info">
          {getStatusInfo(status).description}
        </div>
      </div>
      
      {/* Modals */}
      {showPreventiviModal && selectedCourse && (
        <PreventiviModal
          isOpen={showPreventiviModal}
          onClose={closePreventiviModal}
          // ... other props
        />
      )}
      
      <RegenerateAttestatiModal
        isOpen={showRegenerateModal}
        onClose={closeRegenerateModal}
        // ... other props
      />
    </div>
  );
};
```

---

## ✅ SUCCESS CRITERIA

### Metrics
- [ ] Main component: 761L → ~250L (-67%)
- [ ] Module files created: 11 files
- [ ] Avg module size: <120L per file
- [ ] TypeScript: 0 errors
- [ ] Build: PASSED
- [ ] Breaking changes: 0

### Code Quality
- [ ] Max file size: <500L (ESLint rule)
- [ ] Max complexity: <15
- [ ] No code duplication
- [ ] Clear separation of concerns
- [ ] Reusable components (DocumentSection, DocumentList, DocumentItem)

### Testing
- [ ] Manual test cases (8 test cases):
  1. Generate Lettere Incarico
  2. Generate Registri Presenze
  3. Generate Attestati (with regenerate modal)
  4. Generate Preventivi
  5. Download documents
  6. Delete documents
  7. Edit preventivo
  8. Status change workflow

### Documentation
- [ ] All types documented (JSDoc)
- [ ] README.md created for DocumentManager module
- [ ] Component catalog updated
- [ ] progress_summary.md updated

---

## 🚀 EXECUTION TIMELINE

**Day 1**: Types + Utils (4 hours)
- Create types.ts with all interfaces
- Extract documentHelpers.ts
- Extract documentValidators.ts
- Test imports, TypeScript 0 errors

**Day 2**: Hooks Layer (6 hours)
- Extract useDocumentData.ts
- Extract useDocumentGeneration.ts
- Extract useDocumentActions.ts
- Extract useDocumentUI.ts
- Test each hook in isolation

**Day 3**: Components Layer (6 hours)
- Extract DocumentStatusSelector.tsx
- Extract DocumentSummaryCards.tsx
- Extract DocumentSection.tsx (reusable!)
- Extract DocumentList.tsx
- Extract DocumentItem.tsx
- Test component rendering

**Day 4**: Main Component Refactor (4 hours)
- Create DocumentManager.tsx refactored
- Compose 4 hooks
- Render 5 components
- Test integration
- TypeScript check
- Build test: `npm run build`

**Day 5**: Validation + Commit (4 hours)
- Manual testing (8 test cases)
- Verify zero breaking changes
- Create backup
- Replace original
- Git commit
- Update progress_summary.md

**Total Effort**: ~24 hours (5 days)

---

**Analysis Complete**: ✅  
**Ready for Extraction**: ✅  
**Next Step**: Phase 3.6 Day 1 - Types + Utils Extraction

