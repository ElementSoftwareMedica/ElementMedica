# 🏥 WF_02: Workflow Accettazione Paziente

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Specifiche correlate**: [SPEC_07](../specs/SPEC_07_APPUNTAMENTI.md), [SPEC_08](../specs/SPEC_08_NUMERO_CHIAMATA.md)

---

## 1. DIAGRAMMA FLUSSO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW ACCETTAZIONE                            │
└─────────────────────────────────────────────────────────────────────┘

    Paziente           Segreteria           Sistema            Medico
        │                  │                   │                  │
        │                  │                   │                  │
        │──── Arriva ─────►│                   │                  │
        │                  │                   │                  │
        │                  │──── Cerca App ───►│                  │
        │                  │                   │                  │
        │                  │◄─── Dettaglio ────│                  │
        │                  │                   │                  │
        │                  ├───────────────────┼──────────────────┤
        │                  │   VERIFICA DATI   │                  │
        │                  ├───────────────────┼──────────────────┤
        │                  │                   │                  │
        │◄─── Conferma ────│                   │                  │
        │     Dati?        │                   │                  │
        │                  │                   │                  │
        │──── OK/Mod ─────►│                   │                  │
        │                  │                   │                  │
        │                  ├───────────────────┼──────────────────┤
        │                  │  CONSENSI/PRIVACY │                  │
        │                  ├───────────────────┼──────────────────┤
        │                  │                   │                  │
        │◄─── Firma ───────│                   │                  │
        │     Privacy      │                   │                  │
        │                  │                   │                  │
        │──── Firmato ────►│                   │                  │
        │                  │                   │                  │
        │                  │──── Check-in ────►│                  │
        │                  │                   │                  │
        │                  │◄─── Numero ───────│                  │
        │                  │     Chiamata      │                  │
        │                  │                   │                  │
        │◄─── Ticket ──────│                   │──── Notifica ───►│
        │     N° 42        │                   │                  │
        │                  │                   │                  │
   ┌────┴────┐             │                   │                  │
   │ ATTESA  │             │                   │                  │
   │  SALA   │             │                   │                  │
   └────┬────┘             │                   │                  │
        │                  │                   │                  │
        │                  │                   │◄─── Chiama ──────│
        │                  │                   │                  │
        │◄──────────────── │ ◄─── Monitor ─────│                  │
        │   "N° 42 AMB.3"  │                   │                  │
        │                  │                   │                  │
        │─────────────────────────────────────────── Entra ──────►│
        │                  │                   │                  │
```

---

## 2. STEP DETTAGLIATI

### STEP 1: Arrivo Paziente

**Trigger**: Paziente si presenta al desk

**Azioni Segreteria**:
1. Chiede nome o codice prenotazione
2. Cerca appuntamento nel sistema
3. Verifica stato (deve essere CONFERMATO)

**API**:
```javascript
GET /api/v1/clinica/appuntamenti/oggi
  ?stato=CONFERMATO
  &q=rossi  // ricerca

GET /api/v1/clinica/appuntamenti/:id
```

---

### STEP 2: Verifica Dati Anagrafici

**Azioni**:
1. Mostra dati paziente
2. Segreteria verifica con paziente
3. Aggiorna se necessario (telefono, email, indirizzo)

**Dati da Verificare**:
- Nome e cognome
- Data nascita
- Codice fiscale
- Telefono (per reminder)
- Email

---

### STEP 3: Consensi e Privacy

**Documenti da Firmare**:
| Documento | Obbligatorio | Validità |
|-----------|--------------|----------|
| Privacy generale | ✅ | 1 anno |
| Consenso prestazione | ✅ | Singola visita |
| Marketing | ❌ | Indefinita |

**Azioni**:
1. Verifica consensi già firmati
2. Se mancanti → stampa/tablet firma
3. Archivia consenso firmato

**API**:
```javascript
GET /api/v1/gdpr/consensi/:pazienteId
POST /api/v1/gdpr/consensi
{
  personaId,
  tipo: 'SANITARIO',
  acconsentito: true,
  modalita: 'TABLET'
}
```

---

### STEP 4: Check-in

**Azioni**:
1. Segreteria conferma check-in
2. Sistema assegna numero chiamata
3. Stampa/mostra ticket a paziente
4. Notifica medico (dashboard)

**API**:
```javascript
PATCH /api/v1/clinica/appuntamenti/:id/accetta
{
  oraArrivo: "2024-01-15T09:05:00Z",
  ritardoMinuti: 5  // se in ritardo
}

// Response include:
{
  numeroChiamata: {
    numero: 42,
    ambulatorio: "Ambulatorio 3",
    piano: "1° Piano"
  }
}
```

---

### STEP 5: Attesa e Chiamata

**Paziente**:
- Attende in sala con ticket N° 42
- Guarda monitor per chiamata

**Medico** (quando pronto):
1. Vede lista pazienti in attesa
2. Clicca "Chiama prossimo"
3. Sistema aggiorna monitor
4. Audio notifica in sala

**API**:
```javascript
// Medico chiama
POST /api/v1/clinica/chiamate/:id/chiama
{
  ambulatorioId: "amb-3-uuid"
}

// WebSocket broadcast
{
  type: 'NUMERO_CHIAMATO',
  payload: {
    numero: 42,
    ambulatorio: 'Ambulatorio 3',
    piano: '1° Piano'
  }
}
```

---

## 3. UI COMPONENTS

### Dashboard Segreteria

```tsx
// src/features/accettazione/AccettazioneDashboard.tsx

export function AccettazioneDashboard() {
  const { appuntamentiOggi } = useAppuntamentiOggi();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Colonna 1: Appuntamenti da accettare */}
      <Card>
        <CardHeader>
          <CardTitle>Da Accettare</CardTitle>
        </CardHeader>
        <CardContent>
          <AppuntamentiList 
            appuntamenti={appuntamentiOggi.filter(a => a.stato === 'CONFERMATO')}
            onSelect={handleAccettazione}
          />
        </CardContent>
      </Card>
      
      {/* Colonna 2: In Attesa */}
      <Card>
        <CardHeader>
          <CardTitle>In Sala Attesa</CardTitle>
        </CardHeader>
        <CardContent>
          <CodaAttesa />
        </CardContent>
      </Card>
      
      {/* Colonna 3: Statistiche */}
      <Card>
        <CardHeader>
          <CardTitle>Oggi</CardTitle>
        </CardHeader>
        <CardContent>
          <StatisticheGiornaliere />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Dialog Accettazione

```tsx
// src/features/accettazione/AccettazioneDialog.tsx

export function AccettazioneDialog({ appuntamento, onComplete }) {
  const [step, setStep] = useState<'dati' | 'consensi' | 'checkin'>('dati');
  
  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        {step === 'dati' && (
          <VerificaDatiStep 
            paziente={appuntamento.paziente}
            onNext={() => setStep('consensi')}
          />
        )}
        
        {step === 'consensi' && (
          <ConsensiStep
            paziente={appuntamento.paziente}
            prestazione={appuntamento.prestazione}
            onNext={() => setStep('checkin')}
            onBack={() => setStep('dati')}
          />
        )}
        
        {step === 'checkin' && (
          <CheckinStep
            appuntamento={appuntamento}
            onComplete={onComplete}
            onBack={() => setStep('consensi')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. STATI APPUNTAMENTO

```
CONFERMATO ──────► ACCETTATO ──────► CHIAMATO ──────► IN_VISITA
     │                                    │
     │                                    │
     ▼                                    ▼
 NO_SHOW                              RICHIAMATO
(non si presenta)                   (2° tentativo)
```

---

## 5. GESTIONE CASI SPECIALI

| Caso | Azione |
|------|--------|
| Paziente in ritardo > 15 min | Warning, chiede conferma medico |
| Paziente senza appuntamento (walk-in) | Crea appuntamento urgente se slot disponibile |
| Documentazione mancante | Flag, notifica medico prima della visita |
| Accompagnatore richiesto | Verifica presenza, registra |

---

## 6. COLLEGAMENTI

- **Workflow precedente**: [WF_01_PRENOTAZIONE.md](./WF_01_PRENOTAZIONE.md)
- **Workflow successivo**: [WF_03_VISITA.md](./WF_03_VISITA.md)
- **Specifiche**: [SPEC_07](../specs/SPEC_07_APPUNTAMENTI.md), [SPEC_08](../specs/SPEC_08_NUMERO_CHIAMATA.md)
