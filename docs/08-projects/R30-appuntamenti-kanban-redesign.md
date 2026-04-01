# R30 — Agenda Appuntamenti: Kanban Redesign & Detail Page

**Data**: 2025  
**Stato**: ✅ Completato  
**Branch**: main  
**Files modificati**: 3

---

## Obiettivi

1. Semplificare il kanban unendo colonne Prenotati + Confermati
2. Aggiungere pulsanti azione contestuali per stato
3. Persistere filtri e vista con reset giornaliero
4. Correggere il filtro di ricerca/periodo
5. Redesign completo di `/appuntamenti/:id`
6. Fix errore JSX in VisitaPage.tsx

---

## Modifiche implementate

### 1. `src/pages/clinica/agenda/AppuntamentiPage.tsx`

#### Kanban a 4 colonne (da 5)
| Nuova colonna | Stati inclusi | Header |
|---------------|---------------|--------|
| Prenotati / Confermati | PRENOTATO + CONFERMATO | Gradient blu→verde |
| In Sala d'Attesa | IN_ATTESA | Amber |
| In Corso | IN_CORSO | Viola |
| Completati / Fatturati | COMPLETATO + FATTURATO | Gradient teal→indigo |

```tsx
const kanbanGroups = useMemo(() => ({
    prenotatiConfermati: sortedAppuntamenti.filter(a =>
        a.stato === 'PRENOTATO' || a.stato === 'CONFERMATO'),
    inAttesa: sortedAppuntamenti.filter(a => a.stato === 'IN_ATTESA'),
    inCorso: sortedAppuntamenti.filter(a => a.stato === 'IN_CORSO'),
    completatiFatturati: sortedAppuntamenti.filter(a =>
        a.stato === 'COMPLETATO' || a.stato === 'FATTURATO'),
}), [sortedAppuntamenti]);
```

#### Pulsanti contestuali per stato (KanbanCard)
| Stato | Pulsanti |
|-------|----------|
| PRENOTATO / CONFERMATO | "Accetta Paziente" (teal) + "No Show" (rosso) |
| IN_ATTESA (con numeroCoda) | "Chiama e Visita" (viola) |
| IN_ATTESA (senza numeroCoda) | "Visita" (viola) |
| IN_CORSO | "Vai alla Visita" (viola outline) |
| COMPLETATO | "Fattura" (teal outline) |
| FATTURATO | "Vedi Referto" (indigo outline) |

La colonna merged mostra anche un badge sub-stato `PRENOTATO` / `CONFERMATO` per distinguere le card.

#### Persistenza filtri con reset giornaliero

**Chiave localStorage**: `appuntamenti-filters-v2` (nuova chiave v2)

**Struttura dati**:
```ts
interface PersistedFilters { search: string; stato: string; ambulatorioId: string; view: ViewMode; }
// Salvato come: { date: 'YYYY-MM-DD', data: PersistedFilters }
```

**Logica**:
```ts
function getTodayKey(): string { return new Date().toISOString().slice(0, 10); }
function loadPersistedFilters(): PersistedFilters {
    // Se stored.date !== today → ritorna defaults (reset giornaliero)
    // Altrimenti → ripristina saved data
}
function savePersistedFilters(filters: PersistedFilters): void {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ date: today, data: filters }));
}
```

La vista (list/kanban) è inclusa nella persistenza.

#### Fix ricerca non attivava refetch
`filters.search` era passato direttamente in `queryFn` ma non era nel `queryKey` né nel memo `queryFiltersWithTenant`. Ora è incluso nel memo → React Query invalida la cache al cambio ricerca.

```ts
// PRIMA: search passato separatamente → non nella cache key
// DOPO:
const queryFiltersWithTenant = useMemo(() => ({
    ...(filters.search && { search: filters.search }),
    // ... altri filtri
}), [filters.search, ...]);
```

#### Nuovi mutation: `accettaMutation` + `chiamaMutation`
```ts
const accettaMutation = useMutation({ mutationFn: (id) => appuntamentiApi.accetta(id) });
const chiamaMutation  = useMutation({ mutationFn: (id) => appuntamentiApi.chiama(id) });
```

#### `busyIds` — loading per singola card
```ts
const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
// Su action start: setBusyIds(prev => new Set(prev).add(app.id))
// Su success/error: setBusyIds(prev => { const s = new Set(prev); s.delete(id); return s; })
```

#### `handleKanbanAction(action, app)` — dispatcher centrale
| Azione | Effetto |
|--------|---------|
| `accetta` | `accettaMutation.mutate(id)` → stato IN_ATTESA |
| `noshow` | `changeStatoMutation.mutate({id, stato:'NO_SHOW'})` |
| `visita` | `changeStatoMutation` + navigate a `/visite/:id` |
| `chiama-visita` | `chiamaMutation` + navigate a `/visite/:id` |
| `vai-visita` | navigate a `app.visita?.id` oppure `/visite/appuntamento/:id` |
| `fattura` | navigate a `/fatture/nuova?visitaId=...` |
| `vedi-referto` | navigate a `/visite/:visitaId` |

---

### 2. `src/pages/clinica/agenda/AppuntamentoDetailPage.tsx` — Redesign completo

#### Nuovo STATO_CONFIG
```ts
// Ogni stato ora ha: label, shortLabel, gradient, bgColor, textColor, borderColor, icon
// (rimpiazza vecchio: label, color, bgColor, icon, actions[])
const STATO_CONFIG: Record<StatoAppuntamento, {...}> = { ... };
```

#### `STATO_FLOW` — stepper orizzontale
```ts
const STATO_FLOW: StatoAppuntamento[] = [
    'PRENOTATO', 'CONFERMATO', 'IN_ATTESA', 'IN_CORSO', 'COMPLETATO', 'FATTURATO'
];
```

#### Nuovo sub-componente `StatusFlow`
Stepper orizzontale che mostra il progresso dell'appuntamento. Stati terminali (ANNULLATO, NO_SHOW, RINVIATO) ritornano null.
- Stato corrente: evidenziato con gradiente + testo bianco
- Stati completati: bianco semi-trasparente con spunta
- Stati futuri: traslucido

#### Nuovo sub-componente `InfoRow`
Riga compatta `icon + label: value` con prop `accent` opzionale per stile teal.

#### Layout della pagina
```
[Hero Header]
    - Background gradient per stato
    - Cerchi decorativi
    - Back button + Edit link
    - Icona stato + Numero + Badge coda
    - StatusFlow stepper in box bianco/15

[Body — grid 2/3 + 1/3]
Colonna sinistra:
    [Banner azioni contestuali]     ← per stato (stessa logica kanban)
    [Dettagli appuntamento]         ← InfoRow rows
    [Scheda visita collegata]       ← cliccabile, naviga a visita
    [Fatture]                       ← lista fatture collegate
    [Note]                          ← motivo annullamento + note + noteInterne

Colonna destra:
    [Paziente]                      ← avatar iniziali, tel/email, "Apri Cartella"
    [Medico]                        ← avatar iniziali
    [Gestione]                      ← Aggiorna + Elimina
    [Timestamp]                     ← createdAt / updatedAt
```

---

### 3. `src/pages/clinica/clinica/VisitaPage.tsx` — Fix JSX error

**Errore** (linea ~2283): `Adjacent JSX elements must be wrapped in an enclosing tag`

**Root cause**: Commento JSX `{/* testo */` senza `}` finale → il parser interpreta il JSX successivo come valore di espressione JS.

**Fix**:
```tsx
// PRIMA (errato)
{/* Form with ALL sections expanded with headers (card style) */
// DOPO (corretto)
{/* Form with ALL sections expanded with headers (card style) */}
```

**Pattern identico** al fix della sessione precedente (R29). Location: ramo `else` della ternaria `tabLayout`.

---

## Bugfix Iterazione 2 (post-deploy feedback)

### [AppuntamentoDetailPage.tsx](src/pages/clinica/agenda/AppuntamentoDetailPage.tsx)

#### Hero header sfumature ridotte
Tutti i gradienti in `STATO_CONFIG` sono stati portati su toni più chiari (400→500 invece di 500→600) e un overlay `bg-white/15` è stato aggiunto per uniformare la vivacità su tutti gli stati.

#### Card "Azioni disponibili" riprogettata
Rimossa la `bgColor` colorata dallo sfondo della card — ora usa `bg-white` con una **striscia colorata** (`h-0.5 bg-gradient-to-r`) in cima alla card:
```tsx
<div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
    <div className={`h-0.5 w-full bg-gradient-to-r ${cfg.gradient}`} />
    <div className="p-4">...</div>
</div>
```

#### Pulsante "Elimina Appuntamento" — testo ora visibile
Bug: `CRUDDeleteButton` applicava `bg-red-600 text-white` di default, poi la `className` aggiungeva `text-red-600` → conflitto di specificità Tailwind rendeva il testo invisibile (rosso su rosso).  
Fix: Sostituito con `CRUDButton` con `variant="ghost"` + `className` contenente `text-red-600 hover:bg-red-50`. Il `cn()` (tailwind-merge) di `CRUDButton` gestisce correttamente i conflitti.

#### Link "Modifica" corretto
`/poliambulatorio/agenda/appuntamenti/:id/modifica` → non esiste come route.  
Corretto in `/poliambulatorio/appuntamenti/:id/modifica` (route esistente in App.tsx linea 718).

#### Navigazione "Vai alla Visita" / "Chiama e Visita"
Rimossa navigazione verso `/visite/appuntamento/:id` (route inesistente).  
Sostituita con `appuntamento.visita?.id` → `/visite/${visitaId}` (la visita esiste già al momento dell'azione perché viene creata da `accetta`).

### [AppuntamentiPage.tsx](src/pages/clinica/agenda/AppuntamentiPage.tsx)

Stessa correzione nella kanban per i case `visita`, `chiama-visita`, `vai-visita` in `handleKanbanAction`:
- Rimosso `setTimeout(() => navigate('/visite/appuntamento/${app.id}'), 300)`
- Sostituito con `app.visita?.id ? navigate('/visite/${visita.id}') : navigate('/appuntamenti/${app.id}')`

### [QuestionariModal.tsx](src/pages/clinica/clinica/components/QuestionariModal.tsx)

#### Prestazione non aggiunta alla firma
**Bug**: La callback `onPrestazioneSuggerita` era chiamata SOLO in `compilaMutation.onSuccess` (alla compilazione). Se il questionario era già compilato da una sessione precedente e l'utente firmava in una sessione successiva (`firmaMutation`), la prestazione non veniva mai aggiunta.

**Fix**: Aggiunto check tariffario in `firmaMutation.onSuccess` quando il compilato raggiunge stato `COMPLETATO`:
```ts
onSuccess: async (compilato) => {
    // ...toast + refetch...
    if (compilato.stato === 'COMPLETATO' && companyTenantProfileId && compilato.documentoTemplateId && onPrestazioneSuggerita) {
        // stessa logica di compilaMutation.onSuccess
    }
}
```
Il controllo duplicato in VisitaPage è gestito dal guard:
```ts
const alreadyPresent = prestazioniAggiuntive.some(p => p.nome === data.nome || ...);
if (!alreadyPresent) handleAddPrestazione(...);
```

---

## Testing

```bash
# Verifica compile errors
tsc --noEmit

# Test manuale:
# 1. /agenda → kanban mostra 4 colonne
# 2. Card in PRENOTATO: pulsanti "Accetta Paziente" + "No Show"
# 3. Card in IN_ATTESA: pulsante "Visita" o "Chiama e Visita"
# 4. Card in IN_CORSO: pulsante "Vai alla Visita"
# 5. Card in COMPLETATO: pulsante "Fattura"
# 6. Filtri persistono dopo F5; alle 00:00 si resettano
# 7. /agenda/:id mostra hero gradient softened + StatusFlow + azioni
# 8. Pulsante "Elimina appuntamento" mostra testo in rosso (non invisibile)
# 9. Link "Modifica" funziona senza 404
# 10. "Vai alla Visita" naviga a /visite/:id (non /visite/appuntamento/:id)
# 11. Firma questionario MDL → prestazione aggiunta al completamento anche se compilato da sessione precedente
```


```bash
# Verifica compile errors
tsc --noEmit

# Test manuale:
# 1. /agenda → kanban mostra 4 colonne
# 2. Card in PRENOTATO: pulsanti "Accetta Paziente" + "No Show"
# 3. Card in IN_ATTESA: pulsante "Visita" o "Chiama e Visita"
# 4. Card in IN_CORSO: pulsante "Vai alla Visita"
# 5. Card in COMPLETATO: pulsante "Fattura"
# 6. Filtri persistono dopo F5; alle 00:00 si resettano
# 7. /agenda/:id mostra hero gradient + StatusFlow + azioni
```

---

## Iterazione 3 — Detail Page UX + Modifica Form + Bug Fixes

**Data**: Continuazione R30  
**Files modificati**: 4

### 1. `AppuntamentoDetailPage.tsx` — UI redesign + AccettazionePazienteModal

**Problema**: La barra hero full-bleed gradient era troppo invadente.  
**Soluzione**: Sostituita con header bianco (`bg-white border-b shadow-sm`). Lo stato viene mostrato come piccolo badge pill con gradient solo sul badge.

**Aggiunta AccettazionePazienteModal**:
- Import `AccettazionePazienteModal` e `PatientFormData`
- Stato `isAccettazioneOpen` / `isAccettazioneLoading`
- `handleAccettazioneConfirm`: salva via `appuntamentiApi.accetta`, invalida cache, chiude modal
- Il pulsante "Accetta Paziente" apre il modal completo (4 tab) invece di cambiare stato direttamente
- StatusFlow: colori aggiornati da `text-white/50` a `text-gray-400` per sfondo bianco

### 2. `AppuntamentoForm.tsx` — Completa riscrittura (wizard → form a tab)

**Eliminato**: Wizard a 4 step (Step1Paziente, Step2Prestazione, Step3DataOra, Step4Conferma)  
**Sostituito con**: Form a 3 tab:

| Tab | Contenuto |
|-----|-----------|
| Appuntamento | Data, ora, durata, medico, prestazione, ambulatorio, convenzione, stato (pill selector), note, note interne |
| Paziente | Ricerca paziente (dropdown live), anagrafica (CF con validazione auto-estrazione), residenza (ComuneAutocomplete), contatti |
| Fatturazione | QuickFatturazioneTab (se patient selezionato) |

**Logica di salvataggio**:
1. `pazientiApi.findOrCreate({ existingPersonId, ... })` — salva/crea paziente
2. `appuntamentiApi.update(id, payload)` — salva appuntamento
3. Toast + navigazione a `/clinica/agenda/appuntamenti/:id` on success

### 3. `QuestionariModal.tsx` — Fix tariffario on-load

**Problema**: Questionari già COMPLETATI da sessioni precedenti non scatenano `firmaMutation.onSuccess` → prestazione non aggiunta.  
**Fix**: `useEffect` su `compilati` query che controlla ogni questionario COMPLETATO non ancora verificato:
- Ref `checkedForTariffario: Set<string>` previene doppie chiamate API
- Per ogni COMPLETATO: chiama `tariffariAziendaliApi.getVociByTemplate`
- Se trova voce per l'azienda: chiama `onPrestazioneSuggerita`
- Guard in VisitaPage (`alreadyPresent`) previene duplicati nella lista prestazioni

### 4. `VisitaPage.tsx` — ProfiloSaluteCard visibile di default

**Modifica**: `useState(true)` → `useState(false)` per `profiloSaluteCollapsed`  
**Effetto**: Il profilo di salute è ora espanso di default nella sezione anagrafica della visita.  
La card ha già: click per expand/collapse, "Scheda completa" per modal full-screen, `isReadonly={isReadonly}` per editing quando la visita è attiva.

---

## Note tecniche
- **Merged columns**: il badge sub-stato nella card merged è opzionale; viene mostrato solo se `statuses.length > 1` nella `KanbanColumn`.
- **busyIds immutabilità**: viene sempre creato un nuovo `Set` per garantire re-render React (`new Set(prev).add(id)` invece di `prev.add(id)`).
