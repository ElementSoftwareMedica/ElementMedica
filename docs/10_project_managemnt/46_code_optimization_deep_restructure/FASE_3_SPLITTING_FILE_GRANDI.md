# 📋 Fase 3: Splitting File Grandi - Dettaglio Operativo

**Progetto**: 46 - Ottimizzazione Profonda  
**Fase**: 3 di 8  
**Durata**: 1.5 settimane  
**Rischio**: ALTO  
**Prerequisiti**: Fase 2 completata

---

## 🎯 Obiettivo

Dividere i file che superano 500 linee in moduli più piccoli e gestibili, mantenendo la stessa API pubblica.

---

## 📊 Inventario File Da Dividere

### Backend (>1000 linee) - Priorità CRITICA

| File | Linee | Target | Moduli |
|------|-------|--------|--------|
| clinica-routes.js | 11,219 | <500 | ~25 moduli |
| seed.js | 3,326 | <500 | 8 moduli |
| documentService.js | 2,354 | <400 | 6 moduli |
| clinica-controllers.js | 1,938 | <400 | 5 moduli |
| preventivi-routes.js | 1,856 | <400 | 5 moduli |
| emailService.js | 1,702 | <350 | 5 moduli |
| calendarService.js | 1,598 | <350 | 5 moduli |

### Frontend (>1500 linee) - Priorità ALTA

| File | Linee | Target | Moduli |
|------|-------|--------|--------|
| PreventiviPage.tsx | 3,381 | <300 | 12 moduli |
| CMSPageRenderer.tsx | 3,321 | <300 | 12 moduli |
| CourseDetailPage.tsx | 2,876 | <250 | 10 moduli |
| CalendarioCorsi.tsx | 2,654 | <250 | 9 moduli |
| VisiteSpecialistichePage.tsx | 2,432 | <250 | 9 moduli |

---

## 📁 Struttura Target per Refactoring

### Pattern: Hooks Composition (Frontend)

```
src/pages/finance/preventivi/
├── index.ts                 # Re-export principale
├── types.ts                 # TypeScript types
├── constants.ts             # Costanti e configurazioni
├── PreventiviPage.tsx       # Componente principale (<250L)
├── hooks/
│   ├── index.ts
│   ├── usePreventivi.ts     # Logica principale
│   ├── usePreventivoForm.ts # Form management
│   ├── usePreventivoFilters.ts
│   └── usePreventivoTable.ts
├── components/
│   ├── index.ts
│   ├── PreventivoTable.tsx
│   ├── PreventivoForm.tsx
│   ├── PreventivoFilters.tsx
│   ├── PreventivoRow.tsx
│   └── PreventivoActions.tsx
└── utils/
    ├── index.ts
    ├── validation.ts
    └── formatting.ts
```

### Pattern: Service Layer (Backend)

```
backend/routes/clinica/
├── index.js                 # Router principale
├── ambulatori.routes.js     # Gestione ambulatori
├── poliambulatori.routes.js # Gestione poliambulatori  
├── appuntamenti.routes.js   # Gestione appuntamenti
├── prestazioni.routes.js    # Gestione prestazioni
├── visite.routes.js         # Gestione visite
├── referti.routes.js        # Gestione referti
├── strumenti.routes.js      # Gestione strumenti
├── manutenzioni.routes.js   # Gestione manutenzioni
├── tariffari.routes.js      # Gestione tariffari
└── dashboard.routes.js      # Dashboard stats
```

---

## 🔧 Procedura di Splitting Dettagliata

### 1. clinica-routes.js (11,219 → ~25 moduli)

#### Analisi Attuale

```javascript
// Sezioni identificate nel file:
// Righe 1-200: Import e setup
// Righe 201-800: Ambulatori CRUD
// Righe 801-1400: Poliambulatori CRUD
// Righe 1401-2500: Appuntamenti CRUD + calendario
// Righe 2501-3500: Prestazioni CRUD
// Righe 3501-4800: Visite CRUD + workflow
// Righe 4801-5800: Referti CRUD + firma
// Righe 5801-6500: Strumenti CRUD
// Righe 6501-7200: Manutenzioni CRUD
// Righe 7201-8500: Tariffari CRUD
// Righe 8501-9800: Convenzioni CRUD
// Righe 9801-10500: Report & Stats
// Righe 10501-11219: Utils & Export
```

#### Step 1: Creare directory e file base
```bash
mkdir -p backend/routes/clinica
touch backend/routes/clinica/index.js
```

#### Step 2: Estrarre modulo ambulatori
```javascript
// backend/routes/clinica/ambulatori.routes.js
import { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.js';
import prisma from '../../config/prisma.js';
import logger from '../../utils/logger.js';

const router = Router();

// GET /clinica/ambulatori
router.get('/', requireAuth, async (req, res) => {
  // Logica spostata da clinica-routes.js righe 201-300
});

// POST /clinica/ambulatori
router.post('/', requireAuth, requirePermission('clinica:write'), async (req, res) => {
  // Logica spostata da clinica-routes.js righe 301-400
});

// ... altri endpoints

export default router;
```

#### Step 3: Creare router principale
```javascript
// backend/routes/clinica/index.js
import { Router } from 'express';
import ambulatoriRouter from './ambulatori.routes.js';
import poliambulatoriRouter from './poliambulatori.routes.js';
import appuntamentiRouter from './appuntamenti.routes.js';
// ... altri import

const router = Router();

router.use('/ambulatori', ambulatoriRouter);
router.use('/poliambulatori', poliambulatoriRouter);
router.use('/appuntamenti', appuntamentiRouter);
// ... altre routes

export default router;
```

#### Step 4: Aggiornare server.js
```javascript
// Cambiare da:
import clinicaRouter from './routes/clinica-routes.js';

// A:
import clinicaRouter from './routes/clinica/index.js';
```

---

### 2. PreventiviPage.tsx (3,381 → 12 moduli)

#### Analisi Attuale
```typescript
// Sezioni identificate:
// Righe 1-50: Import
// Righe 51-150: Types e interfaces
// Righe 151-300: State e hooks
// Righe 301-500: Handler functions
// Righe 501-800: Form logic
// Righe 801-1200: Table logic
// Righe 1201-1600: Filters logic
// Righe 1601-2000: CRUD operations
// Righe 2001-2500: UI components inline
// Righe 2501-3000: Modal components
// Righe 3001-3381: Render principale
```

#### Nuova Struttura

```
src/pages/finance/preventivi/
├── index.ts
├── types.ts
├── constants.ts
├── PreventiviPage.tsx       # <250 linee - Solo orchestration
├── hooks/
│   ├── index.ts
│   ├── usePreventivi.ts     # CRUD operations
│   ├── usePreventivoForm.ts # Form state & validation
│   ├── usePreventivoFilters.ts # Filter state
│   └── usePreventivoTable.ts # Table state & sorting
├── components/
│   ├── index.ts
│   ├── PreventiviTable.tsx
│   ├── PreventivoRow.tsx
│   ├── PreventivoForm/
│   │   ├── index.tsx
│   │   ├── CustomerSection.tsx
│   │   ├── ItemsSection.tsx
│   │   ├── DiscountsSection.tsx
│   │   └── SummarySection.tsx
│   ├── PreventivoFilters.tsx
│   ├── PreventivoActions.tsx
│   └── PreventivoModal.tsx
└── utils/
    ├── index.ts
    ├── calculations.ts   # Calcoli totali, IVA, sconti
    ├── validation.ts     # Schema validation
    └── formatting.ts     # Formattazione date, valute
```

#### Esempio: usePreventivi.ts

```typescript
// src/pages/finance/preventivi/hooks/usePreventivi.ts
import { useState, useCallback, useEffect } from 'react';
import { createService } from '@/services/serviceFactory';
import { Preventivo, PreventivoFilters } from '../types';

export const usePreventivi = (initialFilters?: PreventivoFilters) => {
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState(initialFilters ?? {});

  const service = createService<Preventivo>('/preventivi');

  const fetchPreventivi = useCallback(async () => {
    setLoading(true);
    try {
      const data = await service.getAll(filters);
      setPreventivi(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createPreventivo = useCallback(async (data: Partial<Preventivo>) => {
    const created = await service.create(data);
    setPreventivi(prev => [...prev, created]);
    return created;
  }, []);

  const updatePreventivo = useCallback(async (id: string, data: Partial<Preventivo>) => {
    const updated = await service.update(id, data);
    setPreventivi(prev => prev.map(p => p.id === id ? updated : p));
    return updated;
  }, []);

  const deletePreventivo = useCallback(async (id: string) => {
    await service.delete(id);
    setPreventivi(prev => prev.filter(p => p.id !== id));
  }, []);

  useEffect(() => {
    fetchPreventivi();
  }, [fetchPreventivi]);

  return {
    preventivi,
    loading,
    error,
    filters,
    setFilters,
    createPreventivo,
    updatePreventivo,
    deletePreventivo,
    refetch: fetchPreventivi
  };
};
```

#### Esempio: PreventiviPage.tsx Refactored

```typescript
// src/pages/finance/preventivi/PreventiviPage.tsx (< 250 linee)
import React, { useState } from 'react';
import { usePreventivi } from './hooks/usePreventivi';
import { usePreventivoForm } from './hooks/usePreventivoForm';
import { PreventiviTable } from './components/PreventiviTable';
import { PreventivoFilters } from './components/PreventivoFilters';
import { PreventivoModal } from './components/PreventivoModal';
import { PageHeader, Button, LoadingSpinner } from '@/components/ui';
import type { Preventivo } from './types';

export const PreventiviPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreventivo, setSelectedPreventivo] = useState<Preventivo | null>(null);

  const {
    preventivi,
    loading,
    error,
    filters,
    setFilters,
    createPreventivo,
    updatePreventivo,
    deletePreventivo
  } = usePreventivi();

  const handleCreate = () => {
    setSelectedPreventivo(null);
    setIsModalOpen(true);
  };

  const handleEdit = (preventivo: Preventivo) => {
    setSelectedPreventivo(preventivo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<Preventivo>) => {
    if (selectedPreventivo) {
      await updatePreventivo(selectedPreventivo.id, data);
    } else {
      await createPreventivo(data);
    }
    setIsModalOpen(false);
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="p-6">
      <PageHeader 
        title="Preventivi"
        action={<Button onClick={handleCreate}>Nuovo Preventivo</Button>}
      />
      
      <PreventivoFilters 
        filters={filters}
        onChange={setFilters}
      />
      
      <PreventiviTable
        preventivi={preventivi}
        onEdit={handleEdit}
        onDelete={deletePreventivo}
      />
      
      <PreventivoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preventivo={selectedPreventivo}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default PreventiviPage;
```

---

## 📅 Cronoprogramma Giornaliero

### Settimana 1: Backend

#### Giorno 1-2: clinica-routes.js
- [ ] Creare struttura `backend/routes/clinica/`
- [ ] Estrarre ambulatori.routes.js
- [ ] Estrarre poliambulatori.routes.js
- [ ] Estrarre appuntamenti.routes.js
- [ ] Test API endpoints

#### Giorno 3: clinica-routes.js (continua)
- [ ] Estrarre prestazioni.routes.js
- [ ] Estrarre visite.routes.js
- [ ] Estrarre referti.routes.js
- [ ] Test API endpoints

#### Giorno 4: clinica-routes.js (finale)
- [ ] Estrarre strumenti.routes.js
- [ ] Estrarre manutenzioni.routes.js
- [ ] Estrarre tariffari.routes.js
- [ ] Estrarre convenzioni.routes.js
- [ ] Creare index.js router principale

#### Giorno 5: Altri file backend
- [ ] Splitting seed.js in seeder modulari
- [ ] Splitting documentService.js
- [ ] Test completi backend

### Settimana 2: Frontend

#### Giorno 6-7: PreventiviPage.tsx
- [ ] Creare struttura cartelle
- [ ] Estrarre types.ts e constants.ts
- [ ] Creare hooks (usePreventivi, usePreventivoForm, etc.)
- [ ] Creare componenti (Table, Form, Filters)
- [ ] Refactoring PreventiviPage principale

#### Giorno 8: CMSPageRenderer.tsx
- [ ] Creare struttura modulare
- [ ] Estrarre logica rendering
- [ ] Creare componenti sezione
- [ ] Test rendering pagine

#### Giorno 9: CourseDetailPage.tsx & CalendarioCorsi.tsx
- [ ] Applicare pattern hooks composition
- [ ] Creare componenti riutilizzabili
- [ ] Test funzionalità

#### Giorno 10: VisiteSpecialistichePage.tsx & Review
- [ ] Completare refactoring
- [ ] Code review completa
- [ ] Test E2E

---

## ✅ Checklist Verifica Fase 3

### Backend
- [ ] clinica-routes.js eliminato, sostituito da moduli
- [ ] Tutti gli endpoint mantengono stesso path
- [ ] Nessun breaking change API
- [ ] Test unitari passano
- [ ] Test integrazione passano

### Frontend
- [ ] File principali < 300 linee
- [ ] Hooks ben separati (single responsibility)
- [ ] Componenti riutilizzabili
- [ ] Types centralizzati
- [ ] Import corretti e funzionanti
- [ ] Zero errori TypeScript
- [ ] Test E2E passano

### Qualità
- [ ] DRY: nessuna duplicazione
- [ ] SRP: ogni modulo una responsabilità
- [ ] Naming consistente
- [ ] Documentazione aggiornata

---

## 🚨 Rollback Plan

```bash
# Se il refactoring fallisce:

# 1. Restore file originali
git checkout HEAD~1 -- backend/routes/clinica-routes.js
git checkout HEAD~1 -- src/pages/finance/PreventiviPage.tsx

# 2. Rimuovere directory nuove
rm -rf backend/routes/clinica/
rm -rf src/pages/finance/preventivi/

# 3. Rebuild
npm run build
npm test
```

---

## 📚 Best Practices per Splitting

### DO:
- ✅ Mantenere API pubblica identica
- ✅ Creare file index.ts per re-export
- ✅ Separare logic da UI
- ✅ Usare TypeScript per type safety
- ✅ Documentare ogni modulo
- ✅ Test dopo ogni estrazione

### DON'T:
- ❌ Cambiare signature funzioni pubbliche
- ❌ Creare dipendenze circolari
- ❌ Mettere troppa logica in un hook
- ❌ Ignorare errori TypeScript
- ❌ Skip test

---

*Documento Fase 3 - Progetto 46 - 29/12/2025*
