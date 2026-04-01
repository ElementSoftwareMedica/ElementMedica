# R29 — UI Consolidation & Cleanup

**Fase 85** · Data: 2 marzo 2026

---

## Sommario

Sessione multi-task di consolidamento UI: fix errore JSX in VisitaPage, migrazione Monitor Display nella sidebar Struttura, rimozione definitiva tab Accettazione da Appuntamenti (con eliminazione AccettazionePage.tsx), redesign compatto ProfiloSaluteCard, visibilità dati sanitari role-based in employees/:id, e tabLayout abilitato nelle pagine full-size.

---

## 1. Fix JSX Error VisitaPage

**File**: `src/pages/clinica/clinica/VisitaPage.tsx`

**Problema**: JSX comment a riga ~2043 mancava del `}` di chiusura:
```tsx
// PRIMA (errore compilazione):
{/* ========== CENTER: FORM ========== */
<div className="lg:col-span-4">

// DOPO (corretto):
{/* ========== CENTER: FORM ========== */}
<div className="lg:col-span-4">
```

Il compile error impediva il rendering dell'intera pagina VisitaPage, inclusa la sezione ProfiloSalute.

---

## 2. Monitor Display → Sidebar Struttura

**File**: `src/components/layouts/ClinicaLayout.tsx`

Monitor Display era stato inserito sotto **Catalogo** (errato). Spostato alla sezione **Struttura** dove è semanticamente corretto.

```tsx
// PRIMA: Monitor Display sotto Catalogo
{ label: 'Catalogo', children: [..., { label: 'Monitor Display', href: '...monitors' }] }

// DOPO: Monitor Display sotto Struttura
{ label: 'Struttura', children: [..., { label: 'Monitor Display', href: '/poliambulatorio/struttura/monitors' }] }
```

---

## 3. Consolidamento Accettazione → Appuntamenti

### Rationale
AppuntamentiPage aveva già la visualizzazione in colonne (kanban) con toggle switch. Il tab Accettazione era superfluo.

### Modifiche
**`src/pages/clinica/agenda/AppuntamentiPage.tsx`**:
- Rimosso import `lazy`, `Suspense`, `UserCheck`
- Rimosso `AccettazionePageEmbedded` lazy import
- `useSearchParams` ridotto a solo-lettura (rimosso `setSearchParams`)
- Rimossa `activeTab` state derivation
- Rimossa intera tab navigation UI (due bottoni)
- Rimosso blocco `{activeTab === 'accettazione' && (...)}`
- Rimosso wrapper condizionale `{activeTab === 'appuntamenti' && (<>)}`
- Il contenuto Appuntamenti è ora sempre visibile (nessun tab)

**`src/pages/clinica/agenda/index.ts`**:
- Rimossi export `AccettazionePage`, `AccettazionePageDefault`

**`src/pages/clinica/index.lazy.ts`**:
- Rimossa export `AccettazionePageLazy`

**`src/App.tsx`**:
- Route `agenda/accettazione` → redirect a `/poliambulatorio/appuntamenti` (rimosso `?tab=accettazione`)
- Route `accettazione` → redirect a `/poliambulatorio/appuntamenti`

### File Eliminati
- `src/pages/clinica/agenda/AccettazionePage.tsx` — eliminato (pagina legacy)

> **Nota**: I componenti in `components/accettazione/` e `AccettazionePazienteModal`, `ConsensoPrivacyModal`, `NumeroChiamataPanel` sono stati mantenuti perché usati da `CalendarioPage.tsx`.

---

## 4. ProfiloSaluteCard — Redesign Compatto

**File**: `src/components/clinica/ProfiloSaluteCard.tsx`

### Nuova struttura view mode
Layout redesignato da 2 colonne generiche a 4 tile semantiche su large screen:

```
[ALERT: Invalidità (flex-1)] [ALERT: Allergie (flex-1)]   ← full-width, responsive
┌──────────────┬──────────────┬──────────────┬─────────────┐
│  ❤ Patologie │  ⚡ Stile vita│  🛡 DPI & Mez│ 🚗 Pat&Form │
│  (rose-50)   │  (sky-50)    │  (teal-50)   │ (violet-50) │
└──────────────┴──────────────┴──────────────┴─────────────┘
[Note salute — full width italic]
```

Grid: `grid-cols-2 xl:grid-cols-4` — 2 col su mobile/tablet, 4 col su xl+
Ogni tile ha colore semantico distinto e icon header colorata.

### Modifiche specifiche
- Alerts: da `flex-col` a `flex-wrap` con `flex-1` per occupare larghezza disponibile
- Alert invalidità: tutte le info su una sola riga (`·` separato)
- Main grid: `grid-cols-2 xl:grid-cols-4` invece di `grid-cols-1 sm:grid-cols-2`  
- Tiles colorate: rose (patologie), sky (stile vita), teal (DPI), violet (pat&form)
- Rimosso `CheckSquare` da imports (non più usato)
- Font size badges ridotto da `text-[11px]` a `text-[10px]` per compattezza

### tabLayout abilitato nelle pagine full-size
```tsx
// CartellaPaziente.tsx
<ProfiloSaluteCard personId={personId} tabLayout />

// EmployeeDetails.tsx
<ProfiloSaluteCard personId={id} tabLayout />
```

---

## 5. Visibilità Dati Sanitari Role-Based (già presente)

**File**: `src/pages/employees/EmployeeDetails.tsx`

Il controllo era già implementato correttamente:
```tsx
const canSeeMedicalData = user?.roles?.some(r =>
    ['MEDICO', 'ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN', 'COMPANY_ADMIN'].includes(r)
) ?? false;

{canSeeMedicalData ? (
    <ProfiloSaluteCard personId={id} tabLayout />
) : (
    <div className="...lock icon...">
        Dati sanitari riservati — Accesso riservato al Medico Competente e agli amministratori
    </div>
)}
```

---

## File Modificati

| File | Tipo |
|------|------|
| `src/pages/clinica/clinica/VisitaPage.tsx` | Bugfix JSX |
| `src/components/layouts/ClinicaLayout.tsx` | UX fix sidebar |
| `src/pages/clinica/agenda/AppuntamentiPage.tsx` | Refactoring tab removal |
| `src/App.tsx` | Route cleanup |
| `src/pages/clinica/index.lazy.ts` | Legacy cleanup |
| `src/pages/clinica/agenda/index.ts` | Legacy cleanup |
| `src/components/clinica/ProfiloSaluteCard.tsx` | UI redesign |
| `src/pages/clinica/clinica/CartellaPaziente.tsx` | tabLayout prop added |
| `src/pages/employees/EmployeeDetails.tsx` | tabLayout prop added |

## File Eliminati

| File | Motivo |
|------|--------|
| `src/pages/clinica/agenda/AccettazionePage.tsx` | Consolidato in AppuntamentiPage |

## Verifica

- TypeScript: **0 errori** workspace-wide
- Monitor Display visibile in sidebar Struttura
- VisitaPage compila e renderizza correttamente
- AppuntamentiPage mostra contenuto direttamente (no tab)
- ProfiloSaluteCard: layout 4-tile su xl screens
