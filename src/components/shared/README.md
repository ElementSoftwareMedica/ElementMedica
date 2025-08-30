# Struttura dei Componenti

Questo documento definisce l'organizzazione e la struttura dei componenti nell'applicazione per garantire coerenza e prevenire duplicazioni.

## 🚨 REGOLE FONDAMENTALI PER PREVENIRE DUPLICAZIONI 🚨

1. **TUTTI i componenti UI riutilizzabili** devono essere collocati ESCLUSIVAMENTE in `/src/components/shared/ui/`
2. **NON creare file duplicati** con nomi o funzionalità simili in cartelle diverse
3. **SEMPRE verificare l'esistenza** di un componente prima di crearne uno nuovo
4. **Importare dal design system per componenti UI base** (`import { Button, SearchBar, Pagination } from '../../design-system'`) o da `/components/shared/ui` per componenti business-specific (`import { ActionButton, AddEntityDropdown } from '../../components/shared/ui'`)
5. **Estendere componenti esistenti** invece di duplicare funzionalità simili
6. **Mantenere coerenza visiva** in tutti i componenti (pulsanti a pillola, dropdown con icona e freccia, ecc.)

## 🗂️ Organizzazione delle Directory

```
/components
  /layouts        # Layout principali dell'applicazione
  /shared         # Componenti condivisi più complessi e contestuali
    /cards        # Card per entità specifiche
    /forms        # Form complessi riutilizzabili
    /ui/          # ⭐ COMPONENTI UI BASE RIUTILIZZABILI
      index.ts    # Barrel file per esportazioni centralizzate
  /[entity]       # Componenti specifici per un'entità
    EntityForm.tsx
    EntityDetails.tsx
```

## 📋 Procedura Prima di Creare un Nuovo Componente

1. **Cerca componenti esistenti**:
   ```bash
   find src/components/shared/ui -name "*.tsx" | grep -i button  # Cerca bottoni esistenti
   ```

2. **Consulta il barrel file**:
   Controlla `src/components/shared/ui/index.ts` per vedere tutti i componenti esportati

3. **Verifica funzionalità simili**:
   ```jsx
   // CORRETTO: Usa componenti esistenti dal design system
   import { Button, SearchBar } from '../../design-system';
   
   // SBAGLIATO: Non ricreare componenti esistenti
   // Non fare: const CustomButton = ({ label }) => <button>{label}</button>;
   ```

4. **Se necessario, estendi un componente esistente**:
   ```jsx
   // CORRETTO: Estendi un componente esistente dal design system
   import { Button } from '../../design-system';
   
   const SpecializedButton = (props) => (
     <Button variant="primary" {...props} className="special-case" />
   );
   ```

## 🎯 Guida alla Collocazione dei Componenti

| Tipo di Componente | Dove Collocarlo | Esempi |
|---|---|---|
| **UI Base Riutilizzabili** | `/components/shared/ui/` | `Button`, `SearchBar`, `Dropdown` |
| **Form Generici** | `/components/shared/forms/` | `FilterForm`, `SearchForm` |
| **Card/Liste** | `/components/shared/cards/` | `EntityCard`, `DetailsList` |
| **Componenti Specifici** | `/components/[entity]/` | `EmployeeForm`, `CourseDetails` |
| **Layout** | `/components/layouts/` | `MainLayout`, `DashboardLayout` |

## 🎨 Convenzioni di Stile Condivise

Tutti i componenti devono seguire queste convenzioni di stile:

1. **Pulsanti**: Forma a pillola (rounded-full), con icone e testo allineati al centro
2. **Dropdown**: Icona a sinistra, testo al centro, freccia a destra, menu con ombra
3. **Tabelle**: Intestazioni con sfondo gradiente, righe a zebra, colonne azioni fisse
4. **Card**: Bordi arrotondati, ombreggiatura leggera, header con icona e azioni

## 📦 Componenti Condivisi e Loro Utilizzo

### Bottoni e Actions

- `Button`: Pulsante base con varianti (primary, secondary, outline)
- `ActionButton`: Pulsante per azioni di tabella con dropdown
- `ActionDropdown`: Dropdown generico per azioni

### Input e Form

- `SearchBar`: Barra di ricerca con icona e pulsante cancella
- `FilterSortControls`: Controlli per filtro e ordinamento

### Tabelle e Liste

- `ResizableTable`: Tabella con colonne ridimensionabili
- `ColumnSelector`: Selettore per la visibilità delle colonne

### Layout e Navigazione

- `HeaderControls`: Controlli header per le pagine elenco
- `ViewModeToggle`: Toggle per cambio vista tabella/griglia

## 🔄 Come Aggiornare un Componente Esistente

1. **Preferisci aggiungere props** invece di duplicare un componente
2. **Mantieni la retrocompatibilità** usando valori default per le nuove props
3. **Documenta le modifiche** con JSDoc sui parametri

```jsx
/**
 * @param {Object} props - Le props del componente
 * @param {string} props.label - Testo del pulsante
 * @param {ReactNode} [props.icon] - Icona opzionale (NUOVA PROP)
 * @param {'primary'|'secondary'} [props.variant='primary'] - Variante di stile
 */
export const Button = ({ label, icon, variant = 'primary' }) => {
  // Implementazione che supporta la nuova props icon
};
```

## 🐞 Risoluzione dei Problemi Comuni

### Problema: Component Not Found
Assicurati di importare dal percorso corretto: `import { Button } from '../../design-system'` per componenti UI base o `import { ActionButton } from '../../components/shared/ui'` per componenti business-specific

### Problema: Styling Inconsistente  
Usa sempre utility Tailwind o classi condivise definite in `cn()` per mantenere coerenza

### Problema: Comportamento Imprevisto
Controlla il componente originale per comprendere tutte le props disponibili e i comportamenti di default

## 🔍 Come Trovare il Componente Giusto

```bash
# Cerca componenti per nome
find src/components -name "*Button*.tsx"

# Cerca componenti per funzionalità
grep -r "onChange.*viewMode" src/components/

# Visualizza esportazioni centralizzate
cat src/components/shared/ui/index.ts
```

Seguendo queste linee guida, contribuirai a mantenere una codebase pulita, coerente e facile da mantenere.