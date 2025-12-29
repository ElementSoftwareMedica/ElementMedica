# 📺 SPEC_08: Sistema Numero Chiamata

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)

---

## 1. OVERVIEW

Il sistema di chiamata gestisce la coda pazienti in sala d'attesa con:
- Numero progressivo giornaliero
- Monitor sala attesa (TV/Display)
- Notifica sonora/vocale
- Pannello chiamata per segreteria/medico

### 1.1 Flusso

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Check-in   │────►│   Numero    │────►│   Attesa    │
│  Paziente   │     │  Assegnato  │     │  in Sala    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌─────────────┐            │
                    │   Monitor   │◄───────────┤ Chiamata
                    │ Sala Attesa │            │
                    └─────────────┘            │
                                               ▼
                                        ┌─────────────┐
                                        │  Ambulatorio│
                                        │      X      │
                                        └─────────────┘
```

---

## 2. ENTITÀ DATABASE

### 2.1 Modello NumeroChiamata

```prisma
model NumeroChiamata {
  id                    String   @id @default(uuid())
  
  // Numero progressivo giornaliero
  numero                Int
  data                  DateTime @db.Date
  
  // Stato
  isChiamato            Boolean  @default(false)
  dataChiamata          DateTime?
  numeroRichiami        Int      @default(0)      // Volte richiamato
  
  // Destinazione
  ambulatorioDestinazioneId String?
  ambulatorioDestinazione   Ambulatorio? @relation("AmbulatorioChiamata", fields: [ambulatorioDestinazioneId], references: [id])
  
  // Relazione appuntamento
  appuntamento          Appuntamento?
  
  // Priorità (per urgenze)
  priorita              PrioritaChiamata @default(NORMALE)
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([tenantId, data, numero])
  @@index([tenantId])
  @@index([data])
  @@index([isChiamato])
}

enum PrioritaChiamata {
  URGENTE               // Passa avanti
  NORMALE               // Standard
  BASSA                 // Può attendere
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Assegnazione Numero
- Automatica al check-in
- Progressivo giornaliero (reset a mezzanotte)
- Opzione priorità per urgenze

### 3.2 Pannello Chiamata (Segreteria/Medico)
- Lista pazienti in attesa ordinata per numero
- Pulsante "Chiama prossimo"
- Pulsante "Richiama" (se non si presenta)
- Selezione ambulatorio destinazione
- Indicatore tempo attesa

### 3.3 Monitor Sala Attesa
- Display numeri chiamati
- Ambulatorio destinazione
- Audio notifica (beep + voce opzionale)
- Scroll ultimi N chiamati
- Ora corrente, messaggi informativi

### 3.4 WebSocket Real-time

```javascript
// Eventi WebSocket
{
  type: 'NUMERO_CHIAMATO',
  payload: {
    numero: 42,
    ambulatorio: 'Ambulatorio 3',
    piano: '1° Piano'
  }
}

{
  type: 'CODA_AGGIORNATA',
  payload: {
    inAttesa: 15,
    prossimo: 43
  }
}
```

---

## 4. API ENDPOINTS

```
# Numeri chiamata
GET    /api/v1/clinica/chiamate/oggi                   # Numeri di oggi
GET    /api/v1/clinica/chiamate/in-attesa              # In attesa
GET    /api/v1/clinica/chiamate/prossimo               # Prossimo da chiamare

# Azioni
POST   /api/v1/clinica/chiamate/:id/chiama             # Chiama numero
POST   /api/v1/clinica/chiamate/:id/richiama           # Richiama
POST   /api/v1/clinica/chiamate/:id/salta              # Salta (non si presenta)

# Monitor (polling o WebSocket)
GET    /api/v1/clinica/chiamate/monitor                # Stato monitor
WS     /api/v1/clinica/chiamate/ws                     # WebSocket real-time

# Statistiche
GET    /api/v1/clinica/chiamate/stats                  # Tempo medio attesa
```

---

## 5. UI COMPONENTS

### 5.1 Monitor Sala Attesa
```
┌────────────────────────────────────────────────────────┐
│                    POLIAMBULATORIO                     │
│                     ElementMedica                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│         ┌─────────────────────────────────┐           │
│         │                                 │           │
│         │            N° 42                │           │
│         │                                 │           │
│         │      ► AMBULATORIO 3            │           │
│         │         1° Piano                │           │
│         │                                 │           │
│         └─────────────────────────────────┘           │
│                                                        │
│  Ultimi chiamati: 41→Amb.2  40→Amb.1  39→Amb.3       │
│                                                        │
│  In attesa: 8 pazienti                    12:45      │
└────────────────────────────────────────────────────────┘
```

### 5.2 Pannello Chiamata

```
┌────────────────────────────────────┐
│  📞 PANNELLO CHIAMATA              │
├────────────────────────────────────┤
│                                    │
│  Prossimo: N° 43                   │
│  Tempo attesa: 12 min              │
│                                    │
│  Ambulatorio: [Ambulatorio 3 ▼]    │
│                                    │
│  [🔔 CHIAMA PROSSIMO]              │
│                                    │
├────────────────────────────────────┤
│  In Attesa (8)                     │
│  ┌────┬──────────────┬──────────┐  │
│  │ N° │ Paziente     │ Attesa   │  │
│  ├────┼──────────────┼──────────┤  │
│  │ 43 │ Rossi M.     │ 12 min   │  │
│  │ 44 │ Bianchi L.   │ 8 min    │  │
│  │ 45 │ Verdi G. ⚡  │ 5 min    │  │
│  └────┴──────────────┴──────────┘  │
│                                    │
│  ⚡ = Priorità urgente             │
└────────────────────────────────────┘
```

### 5.3 Components
- `MonitorSalaAttesa.tsx` - Display TV full-screen
- `PannelloChiamata.tsx` - Interfaccia operatore
- `CodaAttesa.tsx` - Lista pazienti in attesa
- `NumeroDisplay.tsx` - Numero grande animato
- `AudioNotifica.tsx` - Gestione suoni

---

## 6. CONFIGURAZIONI

```prisma
// In Poliambulatorio
model Poliambulatorio {
  // ...
  
  // Config chiamata
  chiamataAudioAbilitato   Boolean @default(true)
  chiamataVoceAbilitato    Boolean @default(false)  // TTS
  chiamataNumeriVisibili   Int     @default(5)       // Ultimi N sul monitor
  chiamataTempoRichiamo    Int     @default(120)     // Secondi prima richiamo auto
}
```

---

## 7. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | Numero reset giornaliero a 00:00 |
| RB-02 | Max 3 richiami, poi salta automatico |
| RB-03 | Priorità URGENTE passa avanti |
| RB-04 | Paziente chiamato ha 2 min per presentarsi |
| RB-05 | Monitor mostra ultimi 5 numeri chiamati |

---

## 8. IMPLEMENTAZIONE TECNICA

### 8.1 WebSocket Server

```javascript
// backend/websocket/chiamataHandler.js

export function setupChiamataWebSocket(wss) {
  const clients = new Map(); // tenantId -> Set<WebSocket>
  
  wss.on('connection', (ws, req) => {
    const tenantId = req.tenantId;
    
    if (!clients.has(tenantId)) {
      clients.set(tenantId, new Set());
    }
    clients.get(tenantId).add(ws);
    
    ws.on('close', () => {
      clients.get(tenantId)?.delete(ws);
    });
  });
  
  // Broadcast a tutti i client del tenant
  return {
    broadcast: (tenantId, event) => {
      const tenantClients = clients.get(tenantId);
      if (tenantClients) {
        const message = JSON.stringify(event);
        tenantClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    }
  };
}
```

### 8.2 Frontend Hook

```typescript
// src/hooks/useChiamataMonitor.ts

export function useChiamataMonitor() {
  const [ultimoChiamato, setUltimoChiamato] = useState<NumeroChiamata | null>(null);
  const [coda, setCoda] = useState<NumeroChiamata[]>([]);
  
  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/chiamate/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'NUMERO_CHIAMATO':
          setUltimoChiamato(data.payload);
          playNotificationSound();
          break;
        case 'CODA_AGGIORNATA':
          setCoda(data.payload.coda);
          break;
      }
    };
    
    return () => ws.close();
  }, []);
  
  return { ultimoChiamato, coda };
}
```

---

## 9. COLLEGAMENTI

- **Precedente**: [SPEC_07_APPUNTAMENTI.md](./SPEC_07_APPUNTAMENTI.md)
- **Prossimo**: [SPEC_09_VISITE.md](./SPEC_09_VISITE.md)
- **Workflow**: [WF_02_ACCETTAZIONE.md](../workflows/WF_02_ACCETTAZIONE.md)
