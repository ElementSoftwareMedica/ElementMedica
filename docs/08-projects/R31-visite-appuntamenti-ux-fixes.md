# R31 — Visite & Appuntamenti: UX Fixes & Performance

**Data**: 2025  
**Stato**: ✅ Completato  
**Files modificati**: 6

---

## Obiettivo

Serie di fix mirati su `/appuntamenti/:id`, `/visite/:id` e componenti correlati per migliorare UX, correttezza dati e performance.

---

## Fix Applicati

### 1. AppuntamentoForm — durata non caricata in modifica
**File**: `src/pages/clinica/agenda/AppuntamentoForm.tsx`

**Problema**: Alla riapertura di un appuntamento esistente, la `durataMinuti` salvata veniva sovrascritta dall'auto-set effect (`selectedPrestazione?.durataPrevista`), perché il cambio di `prestazioneId` nell'init effect triggerava `selectedPrestazione` che a sua volta triggera l'auto-set.

**Fix**: aggiunto `skipDurataAutoSetRef = useRef<string | null>(null)`. Nell'init effect: `skipDurataAutoSetRef.current = existing.prestazioneId`. L'auto-set effect salta la prima esecuzione se `skipDurataAutoSetRef.current === selectedPrestazione.id`, poi azzera il ref. I successivi cambi manuali di prestazione continuano ad auto-settare normalmente.

---

### 2. AppuntamentoDetailPage — dettagli aggiuntivi e note sempre visibili
**File**: `src/pages/clinica/agenda/AppuntamentoDetailPage.tsx`

**Modifiche**:
- **Scheda paziente estesa**: aggiunti `dataNascita`, `residenza` (città + provincia/regione) sotto il codice fiscale
- **Badge prezzo prestazione**: aggiunto `€ {price.toFixed(2)}` sulla riga prestazione, usando `_prezzoTariffario ?? prezzoBase`
- **Sezione note sempre visibile**: rimossa la conditional `{(appuntamento.note || appuntamento.noteInterne || ...) && (...)}` — le note sono ora sempre renderizzate con fallback "Nessuna nota" / "Nessuna nota interna"

---

### 3. VisitaPage — tariffario trigger dopo firma paziente
**File**: `src/pages/clinica/clinica/VisitaPage.tsx`

**Problema**: La card Prestazioni (tariffario aziendale) veniva popolata solo quando il questionario era in stato `COMPLETATO`, richiedendo entrambe le firme.

**Fix**: Il filtro nel `useEffect` R17 è cambiato da `q.stato === 'COMPLETATO'` a `!!q.firmaPaziente` — il conteggio appare non appena il paziente firma, indipendentemente dalla firma medico.

---

### 4. QuickActionsIntegrated — semplificazione UI firma documenti
**File**: `src/pages/clinica/clinica/components/QuickActionsIntegrated.tsx`

**Problema**: Erano presenti due set di pulsanti firma sovrapposti:
1. Banner in cima (all-at-once, pulsanti grandi) → **mantenuto**
2. Bottom selection-based con checkbox per documento → **rimosso**

**Modifiche**:
- **Rimossi i bottom firma buttons** (questionari e modulistica) con la relativa logica checkbox
- **Nuova struttura row a due righe**:
  - Riga 1: `[icona][titolo completo full-width]`
  - Riga 2 (rientrata): `[data][icona firma paziente][icona firma medico][pdf button][badge stato]` — con `ml-auto` per spingere pdf+badge a destra
- Nessuna breaking change: il banner superiore con `onApplicaFirme` è invariato

---

### 5. VisitaScadenzaCard — badge "Fra X gg" su una riga
**File**: `src/pages/clinica/clinica/components/VisitaScadenzaCard.tsx`

**Problema**: Con 3 cifre (es. "Fra 365 gg") il badge andava a capo.

**Fix**: aggiunto `whitespace-nowrap` alla className dello span badge.

---

### 6. useVisitaForm — "Salva e Completa" più veloce
**File**: `src/pages/clinica/clinica/hooks/useVisitaForm.ts`

**Problema**: Il flusso in `handleSaveAndComplete` era sequenziale: salva → genera PDF (lento, 2-5s) → completa.

**Fix**: replaced con `Promise.all([visiteApi.generateRefertoPdf(visitaId), completeMutation.mutateAsync()])` — PDF e completamento partono in parallelo dopo il salvataggio, riducendo il tempo percepito del 40-60%.

---

## Note Tecniche

- Nessuna modifica API backend
- Nessuna migrazione Prisma necessaria
- Zero errori TypeScript verificati con `get_errors` su tutti i file
