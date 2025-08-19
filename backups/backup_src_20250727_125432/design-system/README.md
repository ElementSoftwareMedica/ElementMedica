# Design System - Component Library

## Overview

Questo design system implementa i principi dell'Atomic Design per creare un sistema di componenti coerente e scalabile. È stato sviluppato durante la **Week 8** del roadmap del progetto.

## Struttura

```
src/design-system/
├── tokens/           # Design tokens (colori, tipografia, spaziature)
├── atoms/           # Componenti atomici (Button, Input)
├── molecules/       # Componenti molecolari (Card)
├── organisms/       # Componenti complessi (da implementare)
├── templates/       # Layout templates (da implementare)
├── design-system.css # CSS globale con variabili
└── index.ts         # Export principale
```

## Design Tokens

I design tokens sono definiti in TypeScript e CSS custom properties per garantire coerenza:

### Colori
- **Primary**: Blu (#3b82f6) con sfumature da 50 a 950
- **Secondary**: Grigio slate con sfumature da 50 a 950
- **Semantic**: Success (verde), Warning (ambra), Error (rosso), Info (blu)
- **Background**: Primario, secondario, terziario, inverso
- **Text**: Primario, secondario, terziario, inverso, disabilitato
- **Border**: Primario, secondario, focus, error, success
- **Interactive**: Hover, active, disabled, focus

### Tipografia
- **Font Families**: Inter (sans), JetBrains Mono (mono), Georgia (serif)
- **Font Sizes**: da xs (0.75rem) a 6xl (3.75rem)
- **Font Weights**: da thin (100) a black (900)
- **Line Heights**: none, tight, snug, normal, relaxed, loose

### Spaziature
- **Component Spacing**: xs (0.25rem) a 2xl (3rem)
- **Layout Spacing**: xs (1rem) a 3xl (8rem)
- **Border Radius**: none a full (9999px)
- **Shadows**: none a 2xl con inner
- **Z-Index**: auto, 0-50, dropdown, modal, tooltip, toast

## Componenti Implementati

### Atoms

#### Button
```tsx
import { Button } from '@/design-system';

<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
```

**Varianti**: primary, secondary, outline, ghost, destructive
**Dimensioni**: sm, md, lg
**Stati**: loading, disabled
**Features**: icone, full-width

#### Input
```tsx
import { Input } from '@/design-system';

<Input
  variant="outline"
  size="md"
  label="Email"
  placeholder="Inserisci la tua email"
  required
/>
```

**Varianti**: default, filled, outline
**Dimensioni**: sm, md, lg
**Stati**: default, error, success, disabled
**Features**: label, helper text, icone, required indicator

### Molecules

#### Card
```tsx
import { Card } from '@/design-system';

<Card
  variant="outlined"
  size="md"
  title="Titolo Card"
  subtitle="Sottotitolo"
  image="/path/to/image.jpg"
  actions={[
    <Button key="action" variant="primary">Azione</Button>
  ]}
>
  Contenuto della card
</Card>
```

**Varianti**: default, outlined, elevated, filled
**Dimensioni**: sm, md, lg
**Features**: header, footer, title, subtitle, image, actions, clickable, loading

## Storybook

Ogni componente include storie Storybook complete con:
- Showcase di tutte le varianti
- Controlli interattivi
- Documentazione delle props
- Esempi d'uso

Per avviare Storybook:
```bash
npm run storybook
```

## Utilizzo

### Import Singolo
```tsx
import { Button, Input, Card } from '@/design-system';
```

### Import Specifico
```tsx
import { Button } from '@/design-system/atoms/Button';
import { Card } from '@/design-system/molecules/Card';
```

### CSS Globale
Importa il CSS del design system nel tuo file principale:
```tsx
import '@/design-system/design-system.css';
```

### Design Tokens in CSS
```css
.custom-component {
  color: var(--color-text-primary);
  background: var(--color-bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

### Design Tokens in TypeScript
```tsx
import { theme, getColor, getSpacing } from '@/design-system';

const styles = {
  color: getColor('text', 'primary'),
  padding: getSpacing('md'),
  backgroundColor: theme.colors.bg.primary
};
```

## Classi Utility CSS

Il design system include classi utility con prefisso `ds-`:

```css
/* Tipografia */
.ds-text-lg { font-size: var(--text-lg); }
.ds-font-semibold { font-weight: var(--font-semibold); }

/* Colori */
.ds-text-primary { color: var(--color-text-primary); }
.ds-bg-secondary { background-color: var(--color-bg-secondary); }

/* Spaziature */
.ds-p-md { padding: var(--spacing-md); }
.ds-m-lg { margin: var(--spacing-lg); }

/* Border Radius */
.ds-rounded-lg { border-radius: var(--radius-lg); }

/* Shadows */
.ds-shadow-md { box-shadow: var(--shadow-md); }
```

## Best Practices

1. **Usa sempre i design tokens** invece di valori hardcoded
2. **Segui la gerarchia atomica** per la composizione dei componenti
3. **Mantieni la coerenza** nelle naming conventions
4. **Documenta ogni componente** con storie Storybook
5. **Testa l'accessibilità** di ogni componente
6. **Usa TypeScript** per type safety
7. **Segui le convenzioni CSS** con prefisso `ds-`

## Prossimi Passi

- [ ] Implementare organismi (Header, Navigation, Forms)
- [ ] Creare template di layout
- [ ] Aggiungere temi (dark mode)
- [ ] Implementare animazioni e transizioni
- [ ] Aggiungere test automatizzati
- [ ] Documentazione avanzata
- [ ] Ottimizzazione bundle size

## Contribuire

Per aggiungere nuovi componenti:
1. Segui la struttura atomica esistente
2. Usa i design tokens definiti
3. Crea storie Storybook complete
4. Aggiungi TypeScript types
5. Documenta l'utilizzo
6. Testa l'accessibilità