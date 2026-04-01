# R25 — Profilo di Salute, Visite & Allegati

**Sprint**: R25  
**Data di completamento**: 2025  
**Stato**: ✅ Completato

---

## Sommario delle modifiche

R25 ha risolto bug critici sulla rubrica allegati, ha migliorato l'integrazione del profilo di salute nelle pagine chiave e ha aggiunto UX migliorata su questionari, date e drag-and-drop.

---

## Bug risolti

### 1. Backend 500 su `GET /api/v1/clinica/documenti/paziente/:id`

**File**: `backend/prisma/schema.prisma`  
**Problema**: Il modello `AllegatoVisita` non aveva la relazione `@relation` verso `Visita`, causando un errore Prisma a runtime quando il controller eseguiva `include: { visita: {...} }`.  
**Soluzione**:
- Aggiunto `allegatiVisite AllegatoVisita[]` nel modello `Visita`
- Aggiunto `visita Visita @relation(fields: [visitaId], references: [id], onDelete: Cascade)` nel modello `AllegatoVisita`
- Eseguito `prisma db push --accept-data-loss` → Prisma Client rigenerato v5.22.0

### 2. JSX error in `EmployeeDetails.tsx`

**File**: `src/pages/employees/EmployeeDetails.tsx`  
**Problema**: Sezione legacy "Sezione aggiuntiva per compatibilità" con div mal annidati causava l'errore "Adjacent JSX elements must be wrapped".  
**Soluzione**: Rimossa l'intera sezione legacy (Stato Lavorativo, Stato Sanitario, Note Aggiuntive).

---

## Nuove funzionalità

### 3. Integrazione ProfiloDiSalute in `/pazienti/:id` e `/employees/:id`

**File**: `src/pages/clinica/clinica/CartellaPaziente.tsx`  
- Il componente `PatientHeader` ora accetta il prop `personId?: string`
- `ProfiloSaluteCard` è resa direttamente all'interno della card anagrafica (prima card in cima alla pagina), separata da un bordo `border-t`
- Rimossa dal tab "Panoramica" dove era invece posizionata prima

**File**: `src/pages/employees/EmployeeDetails.tsx`  
- `ProfiloSaluteCard` spostata nella card anagrafica principale (prima card), sotto la griglia a 3 colonne con i dati del dipendente
- Rimossa la posizione standalone in fondo alla pagina

### 4. Profilo di Salute collassabile in `/visite/:id`

**File**: `src/pages/clinica/clinica/VisitaPage.tsx`  
- Aggiunti stati `profiloSaluteCollapsed` (default: `true`) e `profiloSaluteModalOpen`
- Aggiunte icone `ChevronDown`, `ChevronUp`, `X`, `Heart` da lucide-react
- Sostituiti tutti e 3 i blocchi `<ProfiloSaluteCard compact>` con un pannello collassabile che include:
  - Header con icona cuore e label "Profilo di Salute"
  - Pulsante **"Scheda completa"** che apre il modal a schermo intero (editable)
  - Chevron toggle per espandere/collassare la vista compact
- Aggiunto modal a schermo intero (`z-[200]`) che mostra `ProfiloSaluteCard` in versione completa (non-compact), con sticky header e pulsante chiusura
- Rimosso ProfiloSaluteCard erroneamente iniettato all'interno di una callback `onSectionClick` (bug preesistente)

### 5. Fix "Pre-compila risposte" in Questionari

**File**: `src/components/clinica/questionari/QuestionarioRenderer.tsx`  
**File**: `src/pages/clinica/clinica/components/QuestionariModal.tsx`  
**Problema**: Il preset `da-template` impostava stringa vuota per campi `text`/`select`/`radio` quando non era definito un `defaultValue` esplicito.  
**Soluzione**:
- `text`/`textarea` → valore di default `'Nella norma'`
- `select`/`radio` → primo valore valido non vuoto dal campo `options`
- `date` → data odierna in formato `YYYY-MM-DD`

### 6. Pre-set date su "Prossima Visita Periodica"

**File**: `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx`  
- Aggiunti 4 pulsanti pill sopra il DatePicker in modalità editing: **3 mesi**, **6 mesi**, **1 anno**, **2 anni**
- Il pulsante attivo si evidenzia in teal quando la data selezionata corrisponde al preset

### 7. Fix altezza drag handler allegati

**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`  
**Problema**: La box di drag cambiava altezza durante il drag (causa: `scale-[1.01]` + cambio testo).  
**Soluzione**:
- Altezza fissa con `h-9`
- Rimosso `scale-[1.01]` (causava layout reflow)
- Testo statico: "Carica allegato — immagini, PDF, documenti" sempre visibile
- Indicatore drag "Rilascia qui" con `animate-pulse` in append a destra, senza modificare height
- `transition-all` → `transition-colors` (solo colori transitano, non dimensioni)

---

## File modificati

| File | Modifica |
|------|---------|
| `backend/prisma/schema.prisma` | Aggiunta relazione `AllegatoVisita ↔ Visita` |
| `src/pages/employees/EmployeeDetails.tsx` | Rimossa sezione legacy; ProfiloSaluteCard nella prima card |
| `src/pages/clinica/clinica/CartellaPaziente.tsx` | ProfiloSaluteCard integrata nel PatientHeader |
| `src/pages/clinica/clinica/VisitaPage.tsx` | Pannello collassabile + modal scheda completa |
| `src/components/clinica/questionari/QuestionarioRenderer.tsx` | Fix preset `da-template` |
| `src/pages/clinica/clinica/components/QuestionariModal.tsx` | Fix `buildDefaultDatiCompilati` |
| `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx` | Pre-set date 3m/6m/1y/2y |
| `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx` | Fix altezza drag box |

---

## Note tecniche

- **Multi-tenancy**: tutte le query preesistenti rispettano `tenantId` — nessuna modifica necessaria
- **GDPR**: nessuna operazione di delete — nessun impatto
- **Prisma**: dopo la modifica dello schema è stato eseguito `prisma db push` con successo
- **Zero errori TypeScript** su tutti i file modificati verificati con `get_errors`
