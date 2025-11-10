# Workflow Visivo: Calendario → Preventivo

## 🔄 Flusso Completo (4 STEP)

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Dettagli Corso                                     │
├─────────────────────────────────────────────────────────────┤
│  - Seleziona corso                                          │
│  - Livello rischio / Tipo corso                            │
│  - Durata, modalità erogazione                             │
│  - Formatore principale                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Partecipanti                                       │
├─────────────────────────────────────────────────────────────┤
│  - Seleziona aziende / persone                             │
│  - Filtri e ricerca                                        │
│  - Selezione multipla                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Presenze                                           │
├─────────────────────────────────────────────────────────────┤
│  - Configura presenze per ogni sessione                    │
│  - Selezione partecipanti per data                         │
│  - Auto-select disponibile                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: DOCUMENTI + PREVENTIVO ⭐                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ TAB NAVIGATION                                        │  │
│  │ [📄 Documenti] [🧮 Preventivo] ← SWITCH              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┏━━━━━━━━━━━━━━ TAB: DOCUMENTI ━━━━━━━━━━━━━━┓           │
│  ┃ • Lettere incarico                          ┃           │
│  ┃ • Registri presenze                         ┃           │
│  ┃ • Attestati                                 ┃           │
│  ┃ • Status: Preventivo/Conferma/Fattura       ┃           │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛           │
│                                                             │
│  ┏━━━━━━━━━━━━━ TAB: PREVENTIVO ━━━━━━━━━━━━━┓           │
│  ┃ 📋 Dati Auto-Compilati                     ┃           │
│  ┃ • Corso: [Nome Corso]                      ┃           │
│  ┃ • Cliente: [Azienda/Persona]               ┃           │
│  ┃ • Date: [N sessioni]                       ┃           │
│  ┃                                             ┃           │
│  ┃ Prezzo Base: € _______                     ┃           │
│  ┃ Tipo Servizio: [▼ FORMAZIONE (IVA 22%)]   ┃           │
│  ┃ Descrizione: "Preventivo per [Corso]"      ┃           │
│  ┃ Note: ____________________________          ┃           │
│  ┃                                             ┃           │
│  ┃ 🏷️ Codice Sconto (Opzionale)              ┃           │
│  ┃ [CODICE2024________] [Applica]             ┃           │
│  ┃ ✓ Codice valido! Sconto: 10%               ┃           │
│  ┃                                             ┃           │
│  ┃ 💰 Riepilogo Importi                       ┃           │
│  ┃ Prezzo Base:        € 1,000.00             ┃           │
│  ┃ Sconto Applicato:   - € 100.00             ┃           │
│  ┃ ─────────────────────────────────          ┃           │
│  ┃ Imponibile:         € 900.00               ┃           │
│  ┃ IVA (22%):          € 198.00               ┃           │
│  ┃ ─────────────────────────────────          ┃           │
│  ┃ TOTALE:             € 1,098.00 💙          ┃           │
│  ┃                                             ┃           │
│  ┃               [✓ Crea Preventivo]          ┃           │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛           │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  [API POST /preventivi]
                          ↓
              ✅ Preventivo PRV-2024-0042 creato!
                          ↓
                  [📅 Programma Corso]
                          ↓
           ✅ Evento creato + Preventivo collegato
```

## 🎨 UI Components Utilizzati

### StepPreventivo.tsx
```typescript
<div className="space-y-6">
  {/* Header */}
  <div className="border-b pb-4">
    <Calculator icon /> Preventivo
  </div>

  {/* Auto-populated Info */}
  <InfoPanel>
    📋 Dati Auto-Compilati
    • Corso, Cliente, Date
  </InfoPanel>

  {/* Form Prezzi */}
  <Grid cols={2}>
    <Input label="Prezzo Base" icon={Euro} />
    <Select label="Tipo Servizio" />
  </Grid>

  <Input label="Descrizione" />
  <Textarea label="Note" />

  {/* Codice Sconto */}
  <CodicePanel>
    <Input label="Codice" />
    <Button>Applica</Button>
    {validationMessage && <Message />}
  </CodicePanel>

  {/* Preview Totali */}
  <TotalsPanel>
    💰 Riepilogo Importi
    - Prezzo Base
    - Sconto
    - Imponibile
    - IVA
    - TOTALE
  </TotalsPanel>

  {/* Action */}
  <Button onClick={createPreventivo}>
    ✓ Crea Preventivo
  </Button>
</div>
```

## 🔗 Data Flow

```
┌──────────────────┐
│ ScheduleModal    │
│ Context          │
└────────┬─────────┘
         │
         │ Provides:
         │ - selectedCourse
         │ - selectedCompanies
         │ - selectedPersons
         │ - formData.dates
         │ - persons[]
         │ - companies[]
         ↓
┌──────────────────┐
│ StepPreventivo   │◄──── usePreventivi hook
│ Component        │◄──── useCodiciSconto hook
└────────┬─────────┘
         │
         │ Auto-populate:
         │ ├─ prezzoBase ← course.price
         │ ├─ tipoServizio ← course.tipoServizio
         │ ├─ descrizione ← course.name
         │ ├─ cliente ← selectedCompanies[0] || selectedPersons[0]
         │ └─ dataEmissione ← dates[0].date
         │
         │ User actions:
         │ ├─ Modify prezzo/servizio
         │ ├─ Apply codice sconto
         │ └─ Click "Crea Preventivo"
         ↓
┌──────────────────┐
│ API Layer        │
│ POST /preventivi │
└────────┬─────────┘
         │
         │ Response:
         │ { id, numero, ... }
         ↓
┌──────────────────┐
│ Callback         │
│ onPreventivoCreated(id)
└──────────────────┘
```

## 📊 State Management

### Local State (StepPreventivo)
```typescript
const [prezzoBase, setPrezzoBase] = useState(0);
const [tipoServizio, setTipoServizio] = useState('FORMAZIONE');
const [descrizione, setDescrizione] = useState('');
const [note, setNote] = useState('');
const [codiceSconto, setCodiceSconto] = useState('');
const [scontoApplicato, setScontoApplicato] = useState(null);
const [validationMessage, setValidationMessage] = useState('');
```

### Computed Values (useMemo)
```typescript
const aliquotaIva = useMemo(() => {
  return IVA_RATES[tipoServizio] || 22;
}, [tipoServizio]);

const calcoli = useMemo(() => ({
  prezzoBase,
  scontoTotale: scontoApplicato?.importo || 0,
  imponibile: prezzoBase - scontoTotale,
  importoIva: imponibile * (aliquotaIva / 100),
  importoFinale: imponibile + importoIva
}), [prezzoBase, scontoApplicato, aliquotaIva]);

const clientePrincipale = useMemo(() => {
  // First selected company or person
}, [selectedCompanies, selectedPersons, companies, persons]);
```

## 🧪 Validazione Flow

```
User clicks "Applica" codice sconto
         ↓
validateCodice({ codice, importo, tipoServizio, ... })
         ↓
┌────────┴─────────┐
│                  │
✓ Valido          ✗ Non valido
│                  │
setScontoApplicato setValidationMessage
setMessage("✓")   setMessage("✗")
│                  │
Preview aggiornato Sconto non applicato
```

```
User clicks "Crea Preventivo"
         ↓
Validation checks:
- Cliente selezionato? ✓
- Prezzo > 0? ✓
         ↓
createPreventivo(preventivoData)
         ↓
┌────────┴─────────┐
│                  │
✓ Successo        ✗ Errore
│                  │
applySconto(...)  alert(error)
onPreventivoCreated(id)
alert("✓ PRV-...")
```

## 🎯 Caratteristiche Chiave

### ✅ Auto-populate Intelligente
- Estrae dati già presenti nel modal
- Minimizza input manuale
- Riduce errori utente

### ✅ Calcolo Real-time
- IVA aggiornata al cambio servizio
- Totali ricalcolati al cambio prezzo/sconto
- Preview sempre sincronizzata

### ✅ Validazione Integrata
- Codici sconto verificati via API
- Limiti utilizzo controllati
- Compatibilità servizio/cliente

### ✅ UX Ottimizzata
- Info auto-compilate evidenziate
- Feedback visivo immediato
- Errori chiari e actionable

---

**Versione:** 1.0  
**Data:** 8 Novembre 2024  
**Status:** ✅ Completato e pronto per testing
