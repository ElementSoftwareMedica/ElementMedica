# 🎨 Design System - ElementMedica

**Versione**: 4.0.0  
**Data**: 20 Giugno 2025

---

## 🖋️ Typography

### Font Stack (4 Layer)

| Layer | File | Scopo |
|-------|------|-------|
| 1 | `design-system.css` | CSS variables `--font-*` + Google Fonts imports |
| 2 | `brand-themes.css` | Scoped `.public-layout` typography |
| 3 | `tailwind.config.js` | Tailwind `fontFamily.heading` / `fontFamily.body` |

### Font Families

| Font | Uso | CSS Variable | Tailwind |
|------|-----|-------------|----------|
| **Space Grotesk** | Titoli, sottotitoli, nav, CTA (solo pubblico) | `--font-heading` | `font-heading` |
| **Montserrat** | Body text, paragrafi (solo pubblico) | `--font-body` | `font-body` |
| **Inter** | Dashboard privata, UI admin | `--font-sans` | Default |
| **JetBrains Mono** | Codice, monospaced | `--font-mono` | `font-mono` |

### Applicazione

- Le pagine pubbliche (dentro `PublicLayout`) usano automaticamente:
  - `Space Grotesk` per h1-h6, nav, bottoni, badge, CTA bold labels
  - `Montserrat` per body text, paragrafi, form elements (input, select, textarea, label)
- La dashboard privata continua a usare `Inter`
- La classe `.public-layout` applica lo scope automaticamente
- I contenuti CMS ereditano correttamente via CSS inheritance

```css
/* Automatico in .public-layout */
h1, h2, h3, h4, h5, h6 → Space Grotesk
p, span, body text → Montserrat
nav a, button, [role="button"] → Space Grotesk
input, select, textarea, label → Montserrat
.font-bold.text-2xl/3xl/4xl → Space Grotesk (impatto visivo)
```

---

## 🎨 Brand Colors (Sistema Premium)

### Palette Premium per Brand

| Brand | Primary | Secondary | Accento | Tailwind classes |
|-------|---------|-----------|---------|------------------|
| **Element Sicurezza** | Gold `#E9BA49` | Dark Navy `#283646` | Sage `#EDF1EE` | `brand-primary-*` |
| **Element Medica** | Verde Salvia `#A0C8C1` | Dark Navy `#283646` | Sage `#EDF1EE` | `brand-primary-*` |
| **Management** (Admin) | Violet `#7c3aed` | — | — | `violet-600/700` |

### CSS Variables (brand-themes.css)

```css
/* Definiti sotto [data-brand="element-sicurezza"] e [data-brand="element-medica"] */
--brand-primary-50 ... --brand-primary-950
--brand-secondary-50 ... --brand-secondary-900
--brand-accent-50 ... --brand-accent-900
--brand-gradient-hero / --brand-gradient-cta / --brand-gradient-accent
--brand-surface-primary / secondary / tertiary / elevated / hero
```

### Colori Condivisi (`:root`)

| Ruolo | Variable | Colore |
|-------|----------|--------|
| Success | `--brand-success-500` | `#10b981` |
| Warning | `--brand-warning-500` | `#f59e0b` |
| Error | `--brand-error-500` | `#ef4444` |
| Grays | `--brand-gray-50...950` | Scala neutra |

---

## 🔘 Componenti UI

### Button Patterns

```tsx
// Primary Button - usa semantic tokens (risolve al colore del brand attivo)
<button className="bg-primary-600 text-white hover:bg-primary-700">
  Azione
</button>

// CTA Section - usa dark navy per massimo contrasto WCAG AA
<section className="bg-secondary-800 text-white">
  <button className="bg-white text-secondary-800 hover:bg-primary-100">
    Call to Action
  </button>
</section>

// CRUDPrimaryButton (raccomandato per dashboard)
<CRUDPrimaryButton onClick={handleCreate}>
  <Plus className="w-4 h-4 mr-2" /> Nuovo
</CRUDPrimaryButton>

// Danger Button
<button className="bg-red-600 text-white hover:bg-red-700">
  Elimina
</button>
```

### CMS Semantic Color Tokens

Tutti i componenti CMS renderer usano esclusivamente token semantici brand-aware:

```tsx
// ✅ CORRETTO - usa token semantici
className="bg-primary-50 text-primary-700 border-primary-200"
className="bg-secondary-800 text-white"
className="bg-accent-100 text-accent-800"

// ❌ VIETATO - colori hardcoded
className="bg-teal-600 text-white"
className="bg-blue-500 text-white"
```

| Token | Element Sicurezza | Element Medica |
|-------|------------------|----------------|
| `primary-*` | Gold (#E9BA49) | Verde Salvia (#A0C8C1) |
| `secondary-*` | Dark Navy (#283646) | Dark Navy (#283646) |
| `accent-*` | Sage (#EDF1EE) | Sage (#EDF1EE) |

Files interessati: `types.ts` (color arrays), tutti `*Sections.tsx` in `cms/renderer/`

### ActionButton (Tabelle)

```tsx
import { ActionButton } from '@/components/ui';

<ActionButton
  theme="teal"  // "blue" per Formazione, "violet" per Management
  actions={[
    { 
      label: 'Visualizza', 
      icon: <Eye className="w-4 h-4" />, 
      onClick: () => handleView(id) 
    },
    { 
      label: 'Modifica', 
      icon: <Edit className="w-4 h-4" />, 
      onClick: () => handleEdit(id) 
    },
    { 
      label: 'Elimina', 
      icon: <Trash2 className="w-4 h-4" />, 
      onClick: () => handleDelete(id),
      variant: 'danger'
    },
  ]}
/>
```

### CRUDButton (Tenant-Aware)

```tsx
import { CRUDButton, CRUDPrimaryButton } from '@/components/ui/CRUDButton';

// Si disabilita automaticamente in viewMode='all' senza operateTenantId
<CRUDPrimaryButton onClick={handleCreate}>
  <Plus className="w-4 h-4 mr-2" /> Nuovo
</CRUDPrimaryButton>
```

---

## 📊 Badge Status

### Stati Visita/Appuntamento

| Stato | Colore |
|-------|--------|
| PRENOTATO | `bg-blue-100 text-blue-800` |
| CONFERMATO | `bg-green-100 text-green-800` |
| IN_ATTESA | `bg-yellow-100 text-yellow-800` |
| IN_CORSO | `bg-purple-100 text-purple-800` |
| COMPLETATO | `bg-gray-100 text-gray-800` |
| ANNULLATO | `bg-red-100 text-red-800` |

### Stati Person

| Stato | Colore |
|-------|--------|
| ACTIVE | `bg-green-100 text-green-800` |
| INACTIVE | `bg-gray-100 text-gray-800` |
| PENDING | `bg-yellow-100 text-yellow-800` |

---

## 🏗️ Layout Components

### GDPREntityTemplate

Template standard per tutte le pagine entità:

```tsx
<GDPREntityTemplate<EntityType>
  entityName="entity"
  entityDisplayName="Entità"
  readPermission="entities:read"
  writePermission="entities:write"
  deletePermission="entities:delete"
  apiEndpoint="/entities"
  columns={columns}
  searchFields={['name']}
  filterOptions={filters}
  enableBatchOperations={true}
  defaultViewMode="table"
/>
```

### ViewModeToggle

Toggle tra vista tabella e griglia:

```tsx
<ViewModeToggle 
  mode={viewMode} 
  onChange={setViewMode} 
/>
```

### ResizableTable

Tabella con colonne ridimensionabili:

```tsx
<ResizableTable
  data={items}
  columns={columns}
  onRowClick={(row) => navigate(`/entity/${row.id}`)}
/>
```

---

## 🇮🇹 Onorifici Italiani

### Titoli Medici

```typescript
import { getMedicoTitle, formatMedicoName } from '@/utils/textFormatters';

// Basato sul genere
getMedicoTitle('MALE');    // → "Dott."
getMedicoTitle('FEMALE');  // → "Dott.ssa"

// Nome completo formattato
formatMedicoName({ firstName: 'Mario', lastName: 'Rossi', gender: 'MALE' });
// → "Dott. Rossi Mario"
```

---

## 🔔 Notifiche

### useToast Hook

```tsx
import { useToast } from '@/hooks/ui/useToast';

const { showToast } = useToast();

// Success
showToast({ message: 'Operazione completata', type: 'success' });

// Error
showToast({ message: 'Errore durante il salvataggio', type: 'error' });

// Warning
showToast({ message: 'Attenzione: dati incompleti', type: 'warning' });

// Con durata custom
showToast({ message: 'Info', type: 'info', duration: 5000 });
```

⚠️ **Mai usare `alert()`** - Sempre `showToast()`

---

## 📱 Responsive

### Breakpoints

| Nome | Min Width | Tailwind |
|------|-----------|----------|
| sm | 640px | `sm:` |
| md | 768px | `md:` |
| lg | 1024px | `lg:` |
| xl | 1280px | `xl:` |
| 2xl | 1536px | `2xl:` |

### Mobile First

```tsx
// Mobile: stack, Desktop: inline
<div className="flex flex-col md:flex-row gap-4">
  ...
</div>
```

---

## ♿ Accessibility

### Focus States

```css
/* Visible focus ring - usa token brand */
focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
```

### ARIA Labels

```tsx
<button 
  aria-label="Elimina elemento"
  onClick={handleDelete}
>
  <Trash2 />
</button>
```

### Contrast

- Testo principale: `text-gray-900` su `bg-white`
- Testo secondario: `text-gray-600`
- Minimum contrast ratio: 4.5:1
