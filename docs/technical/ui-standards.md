# Standard UI del Progetto

## Regole Generali per i Componenti

### 🔵 Pulsanti e Dropdown

#### Forma dei Pulsanti
- **REGOLA OBBLIGATORIA**: Tutti i pulsanti devono essere a forma di pillola (`pill=true`) di default
- **ECCEZIONI**: Solo se esplicitamente richiesto diversamente dal design
- **COMPONENTI INTERESSATI**:
  - `ActionButton`
  - `Dropdown`
  - Tutti i pulsanti custom

#### Colori Standard
- **Pulsanti di azione**: Azzurro (`text-blue-600`, `bg-blue-50`)
- **Hover states**: Azzurro più scuro (`hover:text-blue-800`, `hover:bg-blue-100`)
- **Focus states**: Azzurro scuro (`focus:text-blue-800`)

### 📋 Dropdown Menu

#### ActionButton Specifico
- **Testo**: "Azioni" (non icone o simboli)
- **Freccia**: ChevronDown a destra del testo
- **Forma**: Sempre pillola
- **Colore**: Schema azzurro standard

### 🚫 Anti-Pattern da Evitare

1. **Pulsanti rettangolari** senza esplicita richiesta
2. **Icone al posto del testo** nei dropdown principali
3. **Colori non standard** senza approvazione
4. **Dimensioni inconsistenti** tra componenti simili

### ✅ Checklist Pre-Commit UI

- [ ] Tutti i pulsanti sono a forma di pillola
- [ ] I colori seguono lo schema azzurro standard
- [ ] I dropdown mostrano testo + freccia
- [ ] La documentazione del componente è aggiornata
- [ ] Gli esempi di utilizzo sono corretti

### 📚 Riferimenti

- Componente ActionButton: `src/components/shared/ui/ActionButton.tsx`
- Componente Dropdown: `src/design-system/molecules/Dropdown/Dropdown.tsx`
- Design System: `src/design-system/`

---

**Nota**: Questi standard sono obbligatori per mantenere consistenza nell'interfaccia utente. Ogni violazione deve essere giustificata e documentata.