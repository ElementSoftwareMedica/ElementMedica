# Sistema Colori - ElementMedica / ElementSicurezza

## Palette (2026)

### ElementMedica (Frontend Pubblico)
| Ruolo | Colore | Hex | Uso |
|-------|--------|-----|-----|
| Primary | Verde Salvia | `#A0C8C1` | Badge, accenti, decorazioni |
| Secondary | Dark Navy | `#283646` | Header, footer, bottoni, testi scuri |
| Accent | Sage Gray | `#EDF1EE` | Sfondi sezione, backgrounds leggeri |

### ElementSicurezza (Frontend Pubblico)
| Ruolo | Colore | Hex | Uso |
|-------|--------|-----|-----|
| Primary | Gold/Amber | `#E9BA49` | Badge, accenti, decorazioni |
| Secondary | Dark Navy | `#283646` | Header, footer, bottoni, testi scuri |
| Accent | Sage Gray | `#EDF1EE` | Sfondi sezione, backgrounds leggeri |

### Frontend Privato (corrente)
| Ruolo | Colore | Hex |
|-------|--------|-----|
| Primary | Blu | `#2563eb` |
| Secondary | Indaco | `#6366f1` |
| Accent | Viola | `#a855f7` |

---

## Architettura a 4 Livelli

```
Layer 1: design-system.css     → CSS vars default (:root)
Layer 2: brand-themes.css      → CSS vars per brand ([data-brand])
Layer 3: public.ts / private.ts → CSS vars runtime (AreaThemeProvider)
Layer 4: tailwind.config.js    → Mappa CSS vars → classi Tailwind
```

### Flusso

1. **`design-system.css`** definisce valori default per `--color-primary-*`, `--color-medical-*`, `--color-health-*`
2. **`brand-themes.css`** definisce `--brand-primary-*`, `--brand-secondary-*`, `--brand-accent-*` per brand
3. **`public.ts`** / **`private.ts`** definiscono i CSS vars per area:
   - `publicThemeCSSVars` → rileva il brand e imposta `--color-primary-*` appropriato
   - `privateThemeCSSVars` → colori blu/indaco per tutte le route private
4. **`AreaThemeProvider`** rileva se la route è pubblica o privata e applica il tema corretto a `:root`
5. **`tailwind.config.js`** mappa `primary-*` → `var(--color-primary-*)`

### Classi Tailwind disponibili

| Classe | CSS Var | Pubblico Medica | Pubblico Sicurezza | Privato |
|--------|---------|-----|-----|-----|
| `primary-600` | `--color-primary-600` | `#4E8480` | `#B08420` | `#2563eb` |
| `secondary-800` | `--color-secondary-800` | `#283646` | `#283646` | `#3730a3` |
| `accent-100` | `--color-accent-100` | `#EDF1EE` | `#EDF1EE` | `#f3e8ff` |
| `medical-600` | `--color-medical-600` | `#0891b2` | `#0891b2` | `#0891b2` |
| `health-500` | `--color-health-500` | `#22c55e` | `#22c55e` | `#22c55e` |

---

## Scale Complete

### Verde Salvia (Medica Primary)
```
50:  #F3F7F6    400: #80B5AC    800: #2E4F4B
100: #E3EDEB    500: #63A098    900: #1F3533
200: #C8DCD8    600: #4E8480    950: #142221
300: #A0C8C1    700: #3D6963
```

### Gold/Amber (Sicurezza Primary)
```
50:  #FEF9ED    400: #E9BA49    800: #6B4D14
100: #FCF0D1    500: #D4A22F    900: #4A350E
200: #F8E0A2    600: #B08420    950: #2C1F09
300: #F3CE73    700: #8B6619
```

### Dark Navy (Shared Secondary)
```
50:  #F0F2F4    400: #66778A    800: #283646
100: #D9DEE3    500: #4D5E6F    900: #1E2832
200: #B3BCC5    600: #3B4A59    950: #131A21
300: #8C9AA8    700: #313F4E
```

### Sage Gray (Shared Accent)
```
50:  #FAFBFA    400: #A8B5AB    800: #3D4840
100: #EDF1EE    500: #8A9A8E    900: #282F2A
200: #DDE3DE    600: #6E7F72
300: #C5CFC7    700: #556259
```

---

## Come Cambiare i Colori

### Frontend Pubblico
Già migrato a classi CSS variable (`primary-*`, `secondary-*`, `accent-*`).
Per cambiare colori:
1. Modifica `src/design-system/themes/public.ts` → `primaryScales`
2. Modifica `src/styles/brand-themes.css` → sezioni `[data-brand]`
3. Modifica `src/config/brands.config.ts` → campo `colors`
4. I componenti si aggiorneranno automaticamente

### Frontend Privato
I componenti usano ancora classi Tailwind hardcoded. Per migrare:
1. Modifica `src/design-system/themes/private.ts` → colori
2. Cerca e sostituisci nei componenti:
   - `bg-teal-600` → `bg-primary-600`
   - `text-teal-*` → `text-primary-*`
   - `border-teal-*` → `border-primary-*`
   - `bg-blue-600` → `bg-primary-600`
3. Comando per trovare i file:
   ```bash
   grep -rn 'teal-\|blue-[4-8]' src/pages/clinica/ src/pages/management/ --include="*.tsx"
   ```

---

## File Coinvolti

| File | Ruolo |
|------|-------|
| `src/design-system/design-system.css` | CSS vars base (default) |
| `src/styles/brand-themes.css` | CSS vars per brand |
| `src/design-system/themes/public.ts` | Tema pubblico (brand-aware) |
| `src/design-system/themes/private.ts` | Tema privato |
| `src/design-system/themes/AreaThemeProvider.tsx` | Switcher tema automatico |
| `src/config/brands.config.ts` | Configurazione brand e colori |
| `tailwind.config.js` | Mapping CSS vars → Tailwind |
| `src/index.css` | Override CMS HTML content |
