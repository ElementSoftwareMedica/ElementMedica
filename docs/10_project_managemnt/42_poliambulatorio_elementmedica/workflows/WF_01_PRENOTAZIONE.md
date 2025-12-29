# 🎫 WF_01: Workflow Prenotazione Appuntamento

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Specifiche correlate**: [SPEC_05](../specs/SPEC_05_AGENDA.md), [SPEC_06](../specs/SPEC_06_LISTINI.md), [SPEC_07](../specs/SPEC_07_APPUNTAMENTI.md)

---

## 1. DIAGRAMMA FLUSSO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW PRENOTAZIONE                            │
└─────────────────────────────────────────────────────────────────────┘

   Segreteria/Online                Sistema                    Paziente
         │                            │                            │
         │                            │                            │
    ┌────┴────┐                       │                            │
    │ STEP 1  │                       │                            │
    │Seleziona│                       │                            │
    │Paziente │                       │                            │
    └────┬────┘                       │                            │
         │                            │                            │
         │───── Cerca/Crea ──────────►│                            │
         │                            │                            │
         │◄──── Anagrafica ──────────│                            │
         │                            │                            │
    ┌────┴────┐                       │                            │
    │ STEP 2  │                       │                            │
    │Seleziona│                       │                            │
    │Prestaz. │                       │                            │
    └────┬────┘                       │                            │
         │                            │                            │
         │───── Richiesta ───────────►│                            │
         │                            │                            │
         │◄──── Lista + Prezzi ──────│                            │
         │                            │                            │
    ┌────┴────┐                       │                            │
    │ STEP 3  │                       │                            │
    │Seleziona│                       │                            │
    │ Slot    │                       │                            │
    └────┬────┘                       │                            │
         │                            │                            │
         │───── Calcola Disp. ───────►│                            │
         │                            │                            │
         │◄──── Slot Liberi ─────────│                            │
         │                            │                            │
    ┌────┴────┐                       │                            │
    │ STEP 4  │                       │                            │
    │Conferma │                       │                            │
    │Prenota. │                       │                            │
    └────┬────┘                       │                            │
         │                            │                            │
         │───── Conferma ────────────►│                            │
         │                            │──── Email Conferma ───────►│
         │                            │                            │
         │◄──── OK + Codice ─────────│                            │
         │                            │                            │
    ┌────┴────┐                       │                            │
    │ FINE    │                       │                            │
    │Riepilogo│                       │                            │
    └─────────┘                       │                            │
```

---

## 2. STEP DETTAGLIATI

### STEP 1: Selezione Paziente

**Input**: Ricerca o nuovo paziente

**Azioni**:
1. Ricerca per nome/cognome/CF/telefono
2. Se non trovato → form nuovo paziente
3. Verifica consenso privacy
4. Verifica convenzioni attive

**Output**: `pazienteId`

**Validazioni**:
- Email o telefono obbligatorio
- CF valido (se inserito)
- Privacy accettata

---

### STEP 2: Selezione Prestazione

**Input**: `pazienteId`

**Azioni**:
1. Mostra catalogo prestazioni attive
2. Filtro per categoria/specialità
3. Calcola prezzo (listino + convenzioni)
4. Mostra requisiti (digiuno, documenti)

**Output**: `prestazioneId`, `prezzoCalcolato`

**Logica Prezzo**:
```javascript
prezzo = calcolaPrezzo(prestazioneId, pazienteId, codiceSconto)
// Vedi SPEC_06 per algoritmo
```

---

### STEP 3: Selezione Slot

**Input**: `prestazioneId`, `pazienteId`

**Azioni**:
1. Calcola slot disponibili
2. Filtra per medico preferito (opzionale)
3. Filtra per sede (opzionale)
4. Mostra calendario con disponibilità

**Output**: `slotId` (data, ora, medico, ambulatorio)

**Algoritmo Disponibilità**: Vedi SPEC_05

---

### STEP 4: Conferma Prenotazione

**Input**: `pazienteId`, `prestazioneId`, `slotId`

**Azioni**:
1. Riepilogo completo
2. Applicazione codice sconto (opzionale)
3. Note paziente (opzionale)
4. Conferma prenotazione

**Output**: `appuntamentoId`, `codicePrenotazione`

**Post-Conferma**:
- Email conferma a paziente
- Schedula reminder 48h/24h
- Aggiorna slot come occupato
- Audit log

---

## 3. API SEQUENCE

```javascript
// Step 1
GET /api/v1/clinica/search/pazienti?q=rossi
POST /api/v1/persons  // Se nuovo

// Step 2
GET /api/v1/clinica/prestazioni?attive=true
POST /api/v1/clinica/calcola-prezzo
  { prestazioneId, pazienteId, codiceSconto? }

// Step 3
GET /api/v1/clinica/slot-disponibili
  ?prestazioneId=xxx
  &dataInizio=2024-01-15
  &dataFine=2024-01-22
  &medicoId=xxx  // opzionale
  &sedeId=xxx    // opzionale

// Step 4
POST /api/v1/clinica/appuntamenti
{
  pazienteId,
  prestazioneId,
  medicoId,
  ambulatorioId,
  dataOra,
  durataMinuti,
  listinoId,
  convenzioneId?,
  codiceScontoId?,
  note?
}
```

---

## 4. UI WIZARD

### Componenti

```tsx
// src/features/booking/BookingWizard.tsx

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>({});
  
  return (
    <WizardContainer>
      <WizardSteps current={step} />
      
      {step === 1 && (
        <BookingStepPaziente 
          onComplete={(paziente) => {
            setData({ ...data, paziente });
            setStep(2);
          }}
        />
      )}
      
      {step === 2 && (
        <BookingStepPrestazione
          paziente={data.paziente}
          onComplete={(prestazione) => {
            setData({ ...data, prestazione });
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      
      {step === 3 && (
        <BookingStepSlot
          prestazione={data.prestazione}
          onComplete={(slot) => {
            setData({ ...data, slot });
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}
      
      {step === 4 && (
        <BookingStepConferma
          data={data}
          onComplete={handleConfirm}
          onBack={() => setStep(3)}
        />
      )}
    </WizardContainer>
  );
}
```

---

## 5. GESTIONE ERRORI

| Errore | Causa | Azione |
|--------|-------|--------|
| SLOT_NOT_AVAILABLE | Slot prenotato nel frattempo | Torna a step 3, ricarica slot |
| PATIENT_BLOCKED | Paziente con 3+ no-show | Mostra warning, richiedi conferma admin |
| INVALID_DISCOUNT | Codice sconto scaduto/esaurito | Rimuovi sconto, continua |
| CONSENT_REQUIRED | Privacy non accettata | Mostra form consenso |

---

## 6. COLLEGAMENTI

- **Workflow successivo**: [WF_02_ACCETTAZIONE.md](./WF_02_ACCETTAZIONE.md)
- **Specifiche**: [SPEC_05](../specs/SPEC_05_AGENDA.md), [SPEC_06](../specs/SPEC_06_LISTINI.md), [SPEC_07](../specs/SPEC_07_APPUNTAMENTI.md)
