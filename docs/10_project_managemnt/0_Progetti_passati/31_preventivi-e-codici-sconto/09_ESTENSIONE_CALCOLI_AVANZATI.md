# FASE 4: Estensione Preventivi - Completata ✅

**Data:** 8 Novembre 2024  
**Tipo:** Enhancement - Calcoli Avanzati

## 🎯 Nuove Funzionalità Implementate

### 1. **Moltiplicatore Partecipanti**
Calcolo automatico del prezzo totale basato su:
- **Prezzo Unitario**: Costo per singolo partecipante
- **Numero Partecipanti**: Moltiplicatore (min. 1)
- **Totale Automatico**: PrezzoUnitario × NumPartecipanti

**UI:**
```
┌────────────────┬────────────────┬────────────────┐
│ Prezzo Unitario│ N° Partecipanti│ Tipo Servizio  │
│ € 500.00       │ 5              │ Formazione 22% │
│                │ Totale: €2,500 │                │
└────────────────┴────────────────┴────────────────┘
```

### 2. **Spese Accessorie**
Sistema per aggiungere costi aggiuntivi:
- **Voci Multiple**: Materiali, trasferte, attrezzature, etc.
- **Form Inline**: Descrizione + Importo
- **Lista Modificabile**: Rimozione spese con icona
- **Calcolo Integrato**: Spese incluse nell'imponibile

**UI:**
```
┌──────────────────────────────────────────────┐
│ + Spese Accessorie (Opzionali)              │
├──────────────────────────────────────────────┤
│ [Materiali didattici     ] [€ 50.00] [Trash]│
│ [Trasferta formatore     ] [€ 80.00] [Trash]│
├──────────────────────────────────────────────┤
│ [Nuova descrizione...] [€ ___] [+]          │
└──────────────────────────────────────────────┘
```

### 3. **Preventivi Multi-Azienda**
Creazione automatica di **1 preventivo per ogni azienda** selezionata:
- **Loop Aziende**: Itera su `selectedCompanies`
- **Dati Identici**: Stesso corso, prezzi, sconti
- **Note Dettagliate**: Include partecipanti, prezzo unitario, spese
- **Riepilogo Finale**: Lista di tutti i preventivi creati

**Logica:**
```typescript
for (const azienda of selectedCompanies) {
  const preventivo = await createPreventivo({
    aziendaId: azienda.id,
    prezzoTotale: prezzoBase + totaleSpese,
    // ... altri dati
    note: `Partecipanti: ${numPartecipanti}\nPrezzo unitario: €${prezzoUnitario}`
  });
  preventiviCreati.push(preventivo.numero);
}

alert(`✓ Preventivi creati:\n${preventiviCreati.join('\n')}`);
```

## 📊 Calcoli Aggiornati

### Formula Completa
```
1. Subtotale Corso = Prezzo Unitario × N° Partecipanti
2. Totale Spese = Σ Spese Accessorie
3. Subtotale = Subtotale Corso + Totale Spese
4. Sconto = % o € (se applicato)
5. Imponibile = Subtotale - Sconto
6. IVA = Imponibile × Aliquota%
7. TOTALE = Imponibile + IVA
```

### Esempio Calcolo
```
Prezzo Unitario:     €   500.00
× Partecipanti:           × 5
────────────────────────────────
Subtotale Corso:     € 2,500.00

+ Materiali:         €    50.00
+ Trasferta:         €    80.00
────────────────────────────────
Totale Spese:        €   130.00

Subtotale:           € 2,630.00
- Sconto (10%):      -   263.00
────────────────────────────────
Imponibile:          € 2,367.00
+ IVA (22%):         €   520.74
────────────────────────────────
TOTALE:              € 2,887.74
```

## 🔧 Modifiche Tecniche

### State Aggiunto
```typescript
// Prezzi
const [prezzoUnitario, setPrezzoUnitario] = useState<number>(0);
const [numPartecipanti, setNumPartecipanti] = useState<number>(1);

// Spese accessorie
const [speseAccessorie, setSpeseAccessorie] = useState<Array<{
  id: string;
  descrizione: string;
  importo: number;
}>>([]);
const [nuovaSpesaDesc, setNuovaSpesaDesc] = useState<string>('');
const [nuovaSpesaImporto, setNuovaSpesaImporto] = useState<number>(0);
```

### Calcoli Aggiornati
```typescript
const calcoli = useMemo(() => {
  const prezzoBase = prezzoUnitario * numPartecipanti;
  const totaleSpese = speseAccessorie.reduce((sum, s) => sum + s.importo, 0);
  const scontoTotale = scontoApplicato?.importo || 0;
  const imponibile = Math.max(0, prezzoBase + totaleSpese - scontoTotale);
  const importoIva = imponibile * (aliquotaIva / 100);
  const importoFinale = imponibile + importoIva;

  return {
    prezzoUnitario,
    numPartecipanti,
    prezzoBase,
    totaleSpese,
    scontoTotale,
    imponibile,
    aliquotaIva,
    importoIva,
    importoFinale
  };
}, [prezzoUnitario, numPartecipanti, speseAccessorie, scontoApplicato, aliquotaIva]);
```

### Handler Multi-Azienda
```typescript
const handleCreatePreventivo = async () => {
  const aziendePerPreventivi = selectedCompanies.length > 0
    ? selectedCompanies.map(id => companies.find(c => c.id === id)).filter(Boolean)
    : [];

  for (const azienda of aziendePerPreventivi) {
    const preventivoData = {
      aziendaId: azienda.id.toString(),
      // ... calcoli
      note: [
        note || '',
        `Partecipanti: ${numPartecipanti}`,
        `Prezzo unitario: €${prezzoUnitario.toFixed(2)}`,
        speseAccessorie.length > 0 
          ? `Spese: ${speseAccessorie.map(s => `${s.descrizione} €${s.importo}`).join(', ')}`
          : ''
      ].filter(Boolean).join('\n')
    };
    
    await createPreventivo(preventivoData);
  }
};
```

## 📈 Riepilogo Esteso

### Breakdown Visivo
```
┌──────────────────────────────────────┐
│ 💰 Riepilogo                         │
├──────────────────────────────────────┤
│ Prezzo Unitario:      €    500.00   │
│ × Partecipanti:            × 5       │
│ ─────────────────────────────────    │
│ Subtotale Corso:      € 2,500.00    │
│                                       │
│ + Materiali:          €     50.00   │
│ + Trasferta:          €     80.00   │
│ Spese Accessorie:     €    130.00   │
│                                       │
│ - Sconto (10%):       -    263.00   │
│ ─────────────────────────────────    │
│ Imponibile:           € 2,367.00    │
│ IVA (22%):            €    520.74   │
│ ─────────────────────────────────    │
│ TOTALE:               € 2,887.74    │
└──────────────────────────────────────┘
```

## 🎯 Use Cases

### Caso 1: Corso Interaziendale (3 Aziende)
```
Input:
- Prezzo Unitario: €300
- Partecipanti: 10 (distribuiti tra 3 aziende)
- Aziende selezionate: 3

Output:
✓ Preventivi creati:
- PRV-2024-0123 (Azienda A)
- PRV-2024-0124 (Azienda B)
- PRV-2024-0125 (Azienda C)

Ogni preventivo:
- Prezzo: €300 × 10 = €3,000
- Note: "Partecipanti: 10"
```

### Caso 2: Corso con Spese Extra
```
Input:
- Prezzo Unitario: €500
- Partecipanti: 5
- Spese:
  • Materiali: €50
  • Trasferta: €80
  • Attrezzatura: €120

Calcolo:
€500 × 5 = €2,500 (corso)
+ €250 (spese)
= €2,750 (imponibile)
+ €605 (IVA 22%)
= €3,355 (totale)
```

### Caso 3: Medico Competente con Sconto
```
Input:
- Prezzo Unitario: €1,000
- Partecipanti: 1
- Tipo: Medico Competente (IVA 10%)
- Sconto: ESTATE2024 (15%)

Calcolo:
€1,000 × 1 = €1,000
- €150 (sconto)
= €850 (imponibile)
+ €85 (IVA 10%)
= €935 (totale)
```

## 📝 Note Campo Preventivo

Il campo `note` viene auto-compilato con:
```
[Note utente se presenti]

Partecipanti: 5
Prezzo unitario: €500.00

Spese accessorie:
- Materiali didattici: €50.00
- Trasferta formatore: €80.00
```

Questo fornisce tracciabilità completa per ogni preventivo.

## ✅ Validazioni

### Pre-Creazione
- ✅ Prezzo unitario > 0
- ✅ Numero partecipanti ≥ 1
- ✅ Almeno 1 azienda o persona selezionata
- ✅ Tipo servizio selezionato

### Spese Accessorie
- ✅ Descrizione non vuota
- ✅ Importo > 0
- ✅ Nessun limite al numero di voci

## 🎨 UI Enhancements

### Info Banner
```
📋 Dati Auto-Compilati
• Corso: Primo Soccorso
• Aziende: 3 selezionate (1 preventivo per azienda)
• Date: 2 sessioni
```

### Bottone Dinamico
```
[✓ Crea 3 Preventivo/i]  ← Quando 3 aziende selezionate
[✓ Crea Preventivo]       ← Quando 1 persona selezionata
```

## 📊 Metriche

- **Linee codice totali**: 659 (da 472 precedenti)
- **Linee aggiunte**: ~187
- **Nuovi state**: 5 variabili
- **Calcoli estesi**: Da 6 a 10 valori nel riepilogo
- **Handlers**: 1 modificato (handleCreatePreventivo), 1 aggiunto (gestione spese)

## 🚀 Testing Raccomandato

### Test Manuali
- [ ] Prezzo unitario × partecipanti = totale corretto
- [ ] Aggiunta/rimozione spese accessorie
- [ ] Creazione 1 preventivo per persona
- [ ] Creazione N preventivi per N aziende
- [ ] Calcolo IVA con spese accessorie
- [ ] Sconto applicato a subtotale (corso + spese)
- [ ] Note auto-generate correttamente

### Edge Cases
- [ ] 0 partecipanti (dovrebbe fallire validazione)
- [ ] Spese negative (input previene)
- [ ] Nessuna azienda/persona (validazione blocca)
- [ ] 10+ aziende (loop funziona)

---

**Status:** ✅ Implementazione completata  
**Testing:** In attesa di validazione utente  
**Prossimo:** FASE 5 - PDF Generation
