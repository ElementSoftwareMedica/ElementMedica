# 🩺 WF_03: Workflow Visita Medica

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Specifiche correlate**: [SPEC_09](../specs/SPEC_09_VISITE.md), [SPEC_03](../specs/SPEC_03_PRESTAZIONI.md)

---

## 1. DIAGRAMMA FLUSSO

```
┌─────────────────────────────────────────────────────────────────────┐
│                       WORKFLOW VISITA                               │
└─────────────────────────────────────────────────────────────────────┘

      Paziente              Medico               Sistema
          │                    │                    │
          │                    │                    │
          │──── Entra ────────►│                    │
          │     Ambulatorio    │                    │
          │                    │                    │
          │                    │──── Inizia ───────►│
          │                    │     Visita         │
          │                    │                    │
          │                    │◄─── Timer ON ──────│
          │                    │     Form Campi     │
          │                    │                    │
          │                    │                    │
          │                    ├────────────────────┤
          │                    │   COMPILAZIONE     │
          │                    │   FORM VISITA      │
          │                    ├────────────────────┤
          │                    │                    │
          │◄─── Anamnesi ──────│                    │
          │                    │                    │
          │──── Risponde ─────►│                    │
          │                    │                    │
          │◄─── Esame Obj ─────│                    │
          │     (pressione,    │                    │
          │      auscult.)     │                    │
          │                    │──── Salva ────────►│
          │                    │     Campi          │
          │                    │                    │
          │                    │◄─── Auto-save ─────│
          │                    │                    │
          │                    │                    │
          │                    ├────────────────────┤
          │                    │   EVENTUALE        │
          │                    │   ESAME STRUMENT.  │
          │                    ├────────────────────┤
          │                    │                    │
          │◄─── ECG/Eco ───────│                    │
          │                    │                    │
          │                    │──── Upload ───────►│
          │                    │     Allegato       │
          │                    │                    │
          │                    │                    │
          │                    ├────────────────────┤
          │                    │   DIAGNOSI E       │
          │                    │   CONCLUSIONI      │
          │                    ├────────────────────┤
          │                    │                    │
          │◄─── Spiega ────────│                    │
          │     Diagnosi       │                    │
          │                    │                    │
          │                    │──── Fine Visita ──►│
          │                    │                    │
          │                    │◄─── Timer OFF ─────│
          │                    │     Durata: 25min  │
          │                    │                    │
          │◄─── Arrivederci ───│                    │
          │                    │                    │
          │                    │──── Crea Referto ─►│
          │                    │     (Bozza)        │
          │                    │                    │
```

---

## 2. STEP DETTAGLIATI

### STEP 1: Inizio Visita

**Trigger**: Paziente entra in ambulatorio dopo chiamata

**Azioni Medico**:
1. Clicca "Inizia Visita" nella dashboard
2. Sistema crea record Visita
3. Timer durata parte automaticamente

**API**:
```javascript
POST /api/v1/clinica/visite
{
  appuntamentoId: "app-uuid"
}

// Response
{
  id: "visita-uuid",
  stato: "INIZIATA",
  oraInizio: "2024-01-15T09:30:00Z",
  formTemplate: [...campi]
}
```

---

### STEP 2: Scheda Pre-Visita

**Info Mostrate**:
- Anagrafica paziente
- Motivo visita (prestazione)
- Storico visite precedenti (stessa prestazione)
- Allergie/patologie note
- Farmaci in corso

```tsx
// Sidebar paziente durante visita
<PatientSidebar>
  <PatientHeader patient={paziente} />
  <Section title="Allergie">
    <AllergieList allergie={paziente.allergie} />
  </Section>
  <Section title="Visite Precedenti">
    <VisiteStorico visiteId={paziente.id} prestazioneId={prestazione.id} />
  </Section>
</PatientSidebar>
```

---

### STEP 3: Compilazione Form Dinamico

**Form generato da**: Template campi prestazione (SPEC_03)

**Tipologie Campi**:
- Anamnesi (textarea)
- Parametri vitali (number)
- Selezioni (select, checkbox)
- Scale (VAS dolore)
- Note libere

**Auto-save**: Ogni 30 secondi salva bozza

**API**:
```javascript
// Salvataggio campi
PUT /api/v1/clinica/visite/:id/campi
{
  valori: [
    { campoId: "anamnesi", valore: "Paziente riferisce..." },
    { campoId: "pressione_sistolica", valore: "130" },
    { campoId: "pressione_diastolica", valore: "85" }
  ]
}

// Auto-save (background)
POST /api/v1/clinica/visite/:id/autosave
{
  valori: [...]
}
```

---

### STEP 4: Esami Strumentali (Opzionale)

**Se prestazione include esami**:
1. Medico esegue esame (ECG, Eco, etc.)
2. Upload risultato/immagine
3. Annotazioni esame

**API**:
```javascript
POST /api/v1/clinica/visite/:id/allegati
Content-Type: multipart/form-data

file: [binary]
tipo: "ESAME"
descrizione: "ECG a riposo"
```

---

### STEP 5: Diagnosi e Conclusioni

**Campi Finali**:
- Diagnosi
- Terapia prescritta
- Prescrizioni
- Note per follow-up
- Data prossimo controllo (opzionale)

---

### STEP 6: Fine Visita

**Azioni**:
1. Medico clicca "Completa Visita"
2. Validazione campi obbligatori
3. Stop timer → calcolo durata
4. Stato → COMPLETATA
5. Crea bozza referto automatica

**API**:
```javascript
POST /api/v1/clinica/visite/:id/completa

// Response
{
  visita: {
    id: "visita-uuid",
    stato: "COMPLETATA",
    oraFine: "2024-01-15T09:55:00Z",
    durataEffettivaMinuti: 25
  },
  referto: {
    id: "referto-uuid",
    stato: "BOZZA"
  }
}
```

---

## 3. UI COMPONENTS

### Vista Principale Visita

```tsx
// src/features/visite/VisitaInCorso.tsx

export function VisitaInCorso({ visitaId }) {
  const { visita, campi, loading } = useVisita(visitaId);
  const { values, setFieldValue, submit } = useVisitaForm(visitaId);
  
  return (
    <div className="grid grid-cols-4 gap-4 h-screen">
      {/* Sidebar paziente */}
      <div className="col-span-1">
        <PatientSidebar paziente={visita.appuntamento.paziente} />
      </div>
      
      {/* Form principale */}
      <div className="col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>{visita.appuntamento.prestazione.nome}</CardTitle>
              <VisitaTimer oraInizio={visita.oraInizio} />
            </div>
          </CardHeader>
          <CardContent>
            <DynamicForm
              campi={campi}
              values={values}
              onChange={setFieldValue}
            />
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={handleSave}>
              Salva Bozza
            </Button>
            <Button onClick={handleComplete}>
              Completa Visita
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Sidebar azioni */}
      <div className="col-span-1">
        <QuickActions visita={visita} />
        <AllegatiPanel visitaId={visitaId} />
      </div>
    </div>
  );
}
```

### Timer Visita

```tsx
export function VisitaTimer({ oraInizio }) {
  const [elapsed, setElapsed] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(oraInizio).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [oraInizio]);
  
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  
  return (
    <Badge variant={minutes > 30 ? 'destructive' : 'secondary'}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </Badge>
  );
}
```

---

## 4. GESTIONE CASI SPECIALI

| Caso | Azione |
|------|--------|
| Visita interrotta (emergenza) | Salva stato, marca come "SOSPESA" |
| Prestazione aggiuntiva | Aggiunge prestazione alla visita |
| Paziente rifiuta esame | Documenta rifiuto nel form |
| Problemi tecnici strumento | Riprogramma con altro strumento/ambulatorio |

---

## 5. COLLEGAMENTI

- **Workflow precedente**: [WF_02_ACCETTAZIONE.md](./WF_02_ACCETTAZIONE.md)
- **Workflow successivo**: [WF_04_REFERTO.md](./WF_04_REFERTO.md)
- **Specifiche**: [SPEC_09](../specs/SPEC_09_VISITE.md), [SPEC_03](../specs/SPEC_03_PRESTAZIONI.md)
