# R26 — Security Audit & Notification System Redesign

**Status**: ✅ Completato  
**Data**: Giugno 2025  
**Sprint**: R26

---

## Obiettivi

1. Audit completo E2E di sicurezza e bug nel codebase frontend
2. Sistema notifiche elegante e non invasivo (mai `alert()`/`confirm()` nativo)
3. Massimo 1 notifica per azione (deduplicazione + aggregazione)
4. Design toast migliorato (bottom-right, progress bar, dark mode)
5. Rimozione completa del codice legacy

---

## Cambiamenti Implementati

### 1. Sistema Toast — Redesign (R26)

#### `src/context/ToastContext.tsx`
- **`DEDUP_WINDOW_MS`**: 500ms → **2000ms** (elimina notifiche duplicate)
- **`MAX_TOASTS = 3`**: limite massimo toast simultanei (il più vecchio viene rimosso)
- **`timeoutMapRef`**: gestione corretta dei timeout per prevenire memory leak
- **`title?: string`** aggiunto a `ToastData` e `ToastOptions`
- **`createdAt: number`** aggiunto per la progress bar
- `removeToast()` ora cancella il timeout schedulato prima di rimuovere

#### `src/components/shared/Notifications.tsx` — RISCRITTO
| Prima (R25) | Dopo (R26) |
|-------------|-----------|
| `fixed inset-0` — copriva TUTTA la pagina | `fixed bottom-4 right-4` — angolo in basso a destra |
| Nessuna progress bar | Progress bar animata `@keyframes toastProgress` |
| Animazione slide-up | Animazione slide-in da destra |
| Solo light mode | Dark mode completo |
| Titoli hardcoded | `title` personalizzabile + `AUTO_TITLES` per tipo |
| Nessun contatore | `×N` quando messaggi duplicati aggregati |
| `w-full max-w-lg` | `w-80` — compatto, non ingombrante |

**Posizionamento**: `flex-col-reverse` → i nuovi toast appaiono in basso, impilano verso l'alto.

---

### 2. Eliminazione Codice Legacy

#### File eliminati
| File | Motivo |
|------|--------|
| `src/hooks/useToast.tsx` | Implementazione standalone non collegata a ToastContext |
| `src/components/shared/template/Toast.tsx` | Componente orphan non importato da nessuna parte |

#### `src/hooks/index.ts`
- Rimosso re-export `useToastLegacy` (file sorgente eliminato)

---

### 3. Sicurezza — CRITICA

#### `src/utils/formValidation.ts` — `new Function()` eliminato ⚠️ CRITICAL
**Problema**: `new Function('value', validation.customValidation)` eseguiva codice JavaScript arbitrario da stringhe nei template. Qualsiasi admin poteva iniettare JS nel sistema di validazione.

**Fix**: Sostituito con `new RegExp(validation.customValidation)` — ora `customValidation` è un **pattern regex**, non codice JS eseguibile.

```typescript
// PRIMA (pericoloso):
const customFn = new Function('value', validation.customValidation);

// DOPO (sicuro):
const regex = new RegExp(validation.customValidation);
if (!regex.test(String(value))) { /* error */ }
```

**Impatto**: Template con `customValidation` impostato come funzione JS non funzioneranno più — devono essere migrati a regex. Tutti i casi d'uso noti (validazione formato, lunghezza, pattern testuali) sono coperti dai regex.

---

### 4. Sicurezza — XSS via `dangerouslySetInnerHTML`

#### `src/utils/sanitize.ts` — NUOVO FILE
Wrapper DOMPurify con due profili:

```typescript
sanitizeHtml(dirty)      // per contenuti esterni (tooltip, CMS)
sanitizeRichHtml(dirty)  // per editor WYSIWYG (template, referti)
```

`DOMPurify` configurato per:
- Bloccare `<script>`, `<object>`, `<embed>`, `<form>`, `<iframe>`
- Bloccare event handler inline (`onclick`, `onerror`, etc.)
- Preservare stili e classi CSS per formattazione

#### File aggiornati

| File | Tipo sanitizzazione |
|------|---------------------|
| `src/components/dashboard/ScheduleCalendar.tsx` | `sanitizeHtml` |
| `src/components/cms/CMSPageRenderer.tsx` | `sanitizeHtml` |
| `src/components/cms/CMSSectionRenderer.tsx` | `sanitizeHtml` |
| `src/components/editor/slide-editor/SlideElementRenderer.tsx` | `sanitizeRichHtml` |
| `src/components/templates/PreviewPane.tsx` | `sanitizeRichHtml` |
| `src/pages/clinica/impostazioni/modulistica/components/TabTemplate.tsx` | `sanitizeRichHtml` |
| `src/pages/settings/TemplateEditor.tsx` (×2) | `sanitizeRichHtml` |
| `src/pages/clinica/clinica/RefertoEditor.tsx` (×2) | `sanitizeRichHtml` |

---

### 5. Token localStorage — Chiave consistente

**Problema**: Due file usavano `localStorage.getItem('token')` invece di `'authToken'`.  
La chiave canonica è definita in `src/services/auth.ts` → `'authToken'`.

**Fix**: 
- `src/components/ui/PDFPreviewDialog.tsx:50` → `'authToken'`
- `src/pages/management/roles/RoleDetailPage.tsx:298` → `'authToken'`

---

## Architettura Toast System (Post-R26)

```
ToastContext.tsx          ← Provider (stato, dedup, MAX_TOASTS)
    ↓
src/hooks/ui/useToast.ts  ← Hook principale (consume ToastContext)
    ↓
src/components/shared/    ← Renderer (bottom-right, progress bar, dark mode)
  Notifications.tsx
```

**Regola d'uso**:
```typescript
import { useToast } from '@/hooks/useToast';
// oppure
import { useToast } from '../../hooks/ui/useToast';

const { toast } = useToast();
toast({ message: 'Salvato', type: 'success' });
toast({ message: 'Errore', type: 'error', title: 'Titolo custom' });
```

---

## Issues Rimanenti (Backlog)

| Priorità | Issue | Posizione |
|----------|-------|-----------|
| MEDIUM | Test E2E `ot23-allegato3b.spec.ts` usa `'token'` come fallback | `tests/e2e/` |

---

## Fase 2 — Fix Aggiuntivi (27 Febbraio 2026)

### 6. XSS in `ElegantForm.tsx` — innerHTML con messaggio dinamico

**Problema**: `createErrorMessage()` usava `innerHTML` con `${message}` interpolato direttamente nella stringa HTML.  
Il `message` deriva da labelFieldName dei template admin — rischio XSS se un admin inserisce HTML nei label.

**Fix**: Ricostruito l'elemento usando DOM API:
- SVG dell'icona creato con `createElementNS` (statico, nessun input)
- Messaggio applicato con `span.textContent = message` (auto-escape XSS-safe)

### 7. `console.log` Rimossi dalla Produzione

**Problema**: Numerosi `console.log` in codice produzione espongono:
- Dati PII nei payload CRUD (`apiClient.ts:166,186,201`)
- Informazioni token e autenticazione (`auth.ts`, `AuthContext.tsx`, `api.ts`)
- Log di debug verbosi in ogni richiesta HTTP (`requestThrottler.ts` — 15+ log)

**Fix implementati**:

| File | Tipo fix |
|------|----------|
| `src/services/apiClient.ts` | Rimossi 3 `console.log` con dati CRUD (PII risk) |
| `src/services/auth.ts` | Rimossi 3 `console.log` con permissions/personId |
| `src/services/api.ts` | Rimosso debug block token per `/tenants/current` |
| `src/services/requestThrottler.ts` | 15 `console.log` → `this.log()` (DEV-only via `import.meta.env.DEV`) |
| `src/services/preventiviService.ts` | Rimossi 4 `console.log` (PDF download) |
| `src/context/AuthContext.tsx` | Rimossi 3 `console.log` (user data, token) |
| `src/context/PreferencesContext.tsx` | Rimossi 6 `console.log` (user id, preferences) |
| `src/context/TenantContext.tsx` | Rimossi 2 `console.log` (userId, timing) |
| `src/pages/settings/MessagingConfigPage.tsx` | Rimosso 1 `console.log` (component mounted) |
| `src/templates/gdpr-entity-page/GDPREntityTemplate.tsx` | Rimosso 1 `console.log` (CSV data) |

**Pattern usato per `requestThrottler`**: aggiunto helper privato DEV-only:
```typescript
private log(message: string): void {
  if (import.meta.env.DEV) console.debug(message);
}
```

**Regola R26**: Solo `console.error` per errori reali e `console.warn` per warning restano in produzione.

---

## Testing

Tutti i file modificati **zero errori TypeScript** verificati con `get_errors`.

### Smoke test manuale consigliato
1. Login → verificare toast "Accesso effettuato" in bottom-right
2. Azione rapida multipla → verificare che appaia 1 solo toast (dedup 2s)
3. 4+ azioni → verificare che siano visibili max 3 toast
4. Toast rimane 5s → verificare progress bar si svuota
5. Dark mode → verificare colori correct
