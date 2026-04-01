# P45 - Branch Type System

**Stato**: ✅ Completato  
**Data**: Dicembre 2025

---

## 📋 Obiettivo

Separare funzionalità MEDICA e FORMAZIONE con sistema branch.

---

## ✅ Feature Implementate

### BranchType Enum

```prisma
enum BranchType {
  MEDICA
  FORMAZIONE
}
```

### Configurazione Tenant

- `Tenant.enabledBranches: BranchType[]`
- `Tenant.primaryBranch: BranchType?`
- `PersonTenantAccess.enabledBranches: BranchType[]`

### Entità per Branch

| MEDICA | FORMAZIONE |
|--------|------------|
| Prestazione | Course |
| Visita | CourseSchedule |
| Appuntamento | Attestato |
| Referto | RegistroPresenze |

### Frontend Guards

```tsx
<MedicaOnly>
  <PrestazioniPage />
</MedicaOnly>

<FormazioneOnly>
  <CorsiPage />
</FormazioneOnly>
```

### Files

- `backend/utils/branchHelper.js`
- `backend/services/BranchAwareService.js`
- `src/hooks/useBranch.ts`
- `src/contexts/BranchContext.tsx`
- `src/components/guards/BranchGuard.tsx`
