# 📋 SPEC_07: Workflow Appuntamenti

**Versione**: 1.0  
**Ultimo aggiornamento**: 2025-12-11  
**Collegato a**: [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md), [SPEC_08_NUMERO_CHIAMATA.md](./SPEC_08_NUMERO_CHIAMATA.md)

---

## 1. OVERVIEW

L'Appuntamento è l'entità centrale del flusso operativo. Attraversa diversi stati dalla prenotazione alla conclusione della visita.

### 1.1 Stati Appuntamento

```
┌──────────────┐
│  PRENOTATO   │ ← Creazione
└──────┬───────┘
       │ Conferma paziente
       ▼
┌──────────────┐
│  CONFERMATO  │
└──────┬───────┘
       │ Check-in
       ▼
┌──────────────┐
│  ACCETTATO   │ ← Numero chiamata assegnato
└──────┬───────┘
       │ Chiamata medico
       ▼
┌──────────────┐
│   CHIAMATO   │ ← Monitor sala attesa
└──────┬───────┘
       │ Inizio visita
       ▼
┌──────────────┐
│  IN_VISITA   │
└──────┬───────┘
       │ Fine visita
       ▼
┌──────────────┐
│  COMPLETATO  │
└──────────────┘

Stati alternativi:
- CANCELLATO (da qualsiasi stato)
- NO_SHOW (da CONFERMATO se non si presenta)
- RIPROGRAMMATO (spostato ad altra data)
```

### 1.2 Stati Secondari

| Stato Secondario | Descrizione |
|------------------|-------------|
| IN_ATTESA_CONFERMA | Attende conferma paziente |
| CONFERMATO_PAZIENTE | Paziente ha confermato |
| RITARDO_PAZIENTE | Arrivato in ritardo |
| RITARDO_MEDICO | Medico in ritardo |
| DOCUMENTAZIONE_MANCANTE | Manca documentazione |

---

## 2. ENTITÀ DATABASE

### 2.1 Modello Appuntamento

```prisma
model Appuntamento {
  id                    String   @id @default(uuid())
  
  // Identificazione
  codice                String?              // Codice univoco (es. "APP-2024-00123")
  
  // Risorse
  pazienteId            String
  paziente              Person   @relation("PazienteAppuntamenti", fields: [pazienteId], references: [id])
  
  medicoId              String
  medico                Person   @relation("MedicoAppuntamenti", fields: [medicoId], references: [id])
  
  infermiereId          String?
  infermiere            Person?  @relation("InfermiereAppuntamenti", fields: [infermiereId], references: [id])
  
  prestazioneId         String
  prestazione           Prestazione @relation(fields: [prestazioneId], references: [id])
  
  ambulatorioId         String
  ambulatorio           Ambulatorio @relation(fields: [ambulatorioId], references: [id])
  
  // Timing
  dataOra               DateTime
  durataMinuti          Int
  oraFineStimata        DateTime?            // Calcolata
  
  // Stati
  stato                 StatoAppuntamento    @default(PRENOTATO)
  statoSecondario       StatoSecondarioApp?
  
  // Timestamps workflow
  oraArrivo             DateTime?            // Check-in paziente
  oraChiamata           DateTime?            // Chiamata al monitor
  oraInizioVisita       DateTime?            // Effettivo inizio
  oraFineVisita         DateTime?            // Effettiva fine
  
  // Ritardi
  ritardoPazienteMinuti Int?
  ritardoMedicoMinuti   Int?
  
  // Origine prenotazione
  origine               OrigineAppuntamento  @default(TELEFONO)
  
  // Prezzo
  listinoId             String?
  listino               ListinoPrezzo? @relation(fields: [listinoId], references: [id])
  convenzioneId         String?
  convenzione           Convenzione? @relation(fields: [convenzioneId], references: [id])
  codiceScontoId        String?
  prezzoCalcolato       Decimal? @db.Decimal(10,2)
  
  // Ricorrenza
  isRicorrente          Boolean  @default(false)
  ricorrenzaParentId    String?              // ID primo appuntamento serie
  numeroRicorrenza      Int?                 // 1, 2, 3... nella serie
  
  // Note
  note                  String?  @db.Text    // Note visibili a tutti
  noteInterne           String?  @db.Text    // Note solo staff
  motivoCancellazione   String?
  
  // Accessibilità
  richiedeAssistenza    Boolean  @default(false)
  noteAccessibilita     String?
  
  // Privacy
  privacyAccettata      Boolean  @default(false)
  dataPrivacy           DateTime?
  
  // Riferimenti operativi
  prenotatoDaId         String?
  prenotatoDa           Person?  @relation("PrenotatoreAppuntamenti", fields: [prenotatoDaId], references: [id])
  
  accettatoDaId         String?
  accettatoDa           Person?  @relation("AccettatoreAppuntamenti", fields: [accettatoDaId], references: [id])
  
  chiamatoDaId          String?
  chiamatoDa            Person?  @relation("ChiamatoreAppuntamenti", fields: [chiamatoDaId], references: [id])
  
  // Numero chiamata
  numeroChiamataId      String?  @unique
  numeroChiamata        NumeroChiamata? @relation(fields: [numeroChiamataId], references: [id])
  
  // Slot (cache)
  slotId                String?  @unique
  slot                  SlotDisponibilita? @relation(fields: [slotId], references: [id])
  
  // Visita collegata
  visita                Visita?
  
  // Multi-tenancy
  tenantId              String
  tenant                Tenant   @relation(fields: [tenantId], references: [id])
  
  // Timestamps
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  deletedAt             DateTime?
  
  @@index([tenantId])
  @@index([pazienteId])
  @@index([medicoId])
  @@index([ambulatorioId])
  @@index([dataOra])
  @@index([stato])
  @@index([tenantId, dataOra])
}

enum StatoAppuntamento {
  PRENOTATO
  CONFERMATO
  ACCETTATO
  CHIAMATO
  IN_VISITA
  COMPLETATO
  CANCELLATO
  NO_SHOW
  RIPROGRAMMATO
}

enum StatoSecondarioApp {
  IN_ATTESA_CONFERMA
  CONFERMATO_PAZIENTE
  RITARDO_PAZIENTE
  RITARDO_MEDICO
  DOCUMENTAZIONE_MANCANTE
  NESSUNO
}

enum OrigineAppuntamento {
  TELEFONO
  WEB                   // Prenotazione online
  APP                   // App mobile
  WALK_IN               // Presentazione diretta
  RICHIAMO              // Richiamato per controllo
  CONVENZIONE           // Tramite convenzione
  ALTRO
}
```

---

## 3. FUNZIONALITÀ

### 3.1 Prenotazione
| Azione | Permesso | Note |
|--------|----------|------|
| Crea appuntamento | `BOOK_APPOINTMENTS` | Segreteria, Paziente (online) |
| Visualizza | `VIEW_AGENDA` | - |
| Modifica data/ora | `BOOK_APPOINTMENTS` | Solo se PRENOTATO/CONFERMATO |
| Cancella | `CANCEL_APPOINTMENTS` | Motivazione obbligatoria |

### 3.2 Workflow Operativo
| Azione | Permesso | Note |
|--------|----------|------|
| Accettazione (check-in) | `MANAGE_AGENDA` | Segreteria |
| Chiamata paziente | `MANAGE_AGENDA` | Segreteria, Medico |
| Inizio visita | `START_VISITS` | Medico |
| Fine visita | `COMPLETE_VISITS` | Medico |

### 3.3 Reminder
- **48h prima**: Email reminder
- **24h prima**: SMS reminder
- **2h prima**: WhatsApp (se opt-in)
- **Conferma richiesta**: Link conferma in messaggio

---

## 4. API ENDPOINTS

```
# CRUD
GET    /api/v1/clinica/appuntamenti                    # Lista (filtri multipli)
GET    /api/v1/clinica/appuntamenti/:id                # Dettaglio
POST   /api/v1/clinica/appuntamenti                    # Crea
PUT    /api/v1/clinica/appuntamenti/:id                # Modifica
DELETE /api/v1/clinica/appuntamenti/:id                # Cancella

# Workflow
PATCH  /api/v1/clinica/appuntamenti/:id/conferma       # Conferma paziente
PATCH  /api/v1/clinica/appuntamenti/:id/accetta        # Check-in
PATCH  /api/v1/clinica/appuntamenti/:id/chiama         # Chiama (monitor)
PATCH  /api/v1/clinica/appuntamenti/:id/inizia         # Inizio visita
PATCH  /api/v1/clinica/appuntamenti/:id/completa       # Fine visita
PATCH  /api/v1/clinica/appuntamenti/:id/cancella       # Cancella
PATCH  /api/v1/clinica/appuntamenti/:id/no-show        # Segna no-show
PATCH  /api/v1/clinica/appuntamenti/:id/riprogramma    # Sposta

# Viste
GET    /api/v1/clinica/appuntamenti/oggi               # Appuntamenti oggi
GET    /api/v1/clinica/appuntamenti/medico/:medicoId   # Per medico
GET    /api/v1/clinica/appuntamenti/paziente/:pazId    # Storico paziente

# Reminder
POST   /api/v1/clinica/appuntamenti/:id/reminder       # Invia reminder manuale
```

---

## 5. DIAGRAMMA SEQUENZA

### 5.1 Flusso Prenotazione → Visita

```
Paziente      Segreteria       Sistema        Medico         Monitor
    │              │              │              │              │
    │──Prenota────►│              │              │              │
    │              │──Crea───────►│              │              │
    │              │              │──Reminder───►│              │
    │◄─Email conf──│              │              │              │
    │              │              │              │              │
    │──Arriva─────►│              │              │              │
    │              │──Check-in───►│              │              │
    │              │              │──Notifica───►│              │
    │              │              │              │──Chiama─────►│
    │              │              │              │              │──Mostra
    │◄─────────────│──────────────│──────────────│◄─────────────│
    │──Va in amb──►│              │              │              │
    │              │              │              │──Inizia vis─►│
    │              │              │              │              │
    │              │              │              │──Fine vis───►│
    │              │              │◄─Aggiorna────│              │
```

---

## 6. UI COMPONENTS

### 6.1 Pagine
- `AppuntamentiList.tsx` - Lista/tabella
- `AppuntamentoDetail.tsx` - Dettaglio
- `BookingWizard.tsx` - Wizard prenotazione
- `AccettazioneView.tsx` - Dashboard segreteria

### 6.2 Wizard Prenotazione (Steps)
1. `BookingStep1Paziente.tsx` - Seleziona/crea paziente
2. `BookingStep2Prestazione.tsx` - Seleziona prestazione
3. `BookingStep3Slot.tsx` - Seleziona data/ora
4. `BookingStep4Conferma.tsx` - Riepilogo e conferma

### 6.3 Widgets
- `AppuntamentoCard.tsx` - Card singolo appuntamento
- `AppuntamentoTimeline.tsx` - Timeline stati
- `QuickActions.tsx` - Azioni rapide
- `StatoBadge.tsx` - Badge stato colorato

---

## 7. VALIDAZIONI

```javascript
// backend/validations/clinica/appuntamento.js

export const appuntamentoSchema = {
  create: Joi.object({
    pazienteId: Joi.string().uuid().required(),
    prestazioneId: Joi.string().uuid().required(),
    medicoId: Joi.string().uuid().required(),
    ambulatorioId: Joi.string().uuid().required(),
    dataOra: Joi.date().iso().min('now').required(),
    durataMinuti: Joi.number().integer().min(5).max(480).required(),
    origine: Joi.string().valid(...Object.values(OrigineAppuntamento)),
    listinoId: Joi.string().uuid(),
    convenzioneId: Joi.string().uuid(),
    codiceScontoId: Joi.string().uuid(),
    note: Joi.string().max(1000),
    richiedeAssistenza: Joi.boolean(),
    noteAccessibilita: Joi.string().max(500)
  }),
  
  changeStatus: Joi.object({
    stato: Joi.string().valid(...Object.values(StatoAppuntamento)).required(),
    motivo: Joi.string().max(500).when('stato', {
      is: 'CANCELLATO',
      then: Joi.required()
    })
  })
};
```

---

## 8. REGOLE BUSINESS

| ID | Regola |
|----|--------|
| RB-01 | No doppia prenotazione stesso paziente/ora |
| RB-02 | No prenotazione passato |
| RB-03 | Max anticipo prenotazione configurabile |
| RB-04 | Cancellazione < 24h → possibile penale |
| RB-05 | No-show 3 volte → warning/blocco |
| RB-06 | Check-in richiede accettazione privacy |
| RB-07 | Stato non può tornare indietro (tranne RIPROGRAMMATO) |

---

## 9. COLLEGAMENTI

- **Precedente**: [SPEC_06_LISTINI.md](./SPEC_06_LISTINI.md)
- **Prossimo**: [SPEC_08_NUMERO_CHIAMATA.md](./SPEC_08_NUMERO_CHIAMATA.md)
- **Correlato**: [SPEC_05_AGENDA.md](./SPEC_05_AGENDA.md), [SPEC_09_VISITE.md](./SPEC_09_VISITE.md)
- **Workflow**: [WF_01_PRENOTAZIONE.md](../workflows/WF_01_PRENOTAZIONE.md), [WF_02_ACCETTAZIONE.md](../workflows/WF_02_ACCETTAZIONE.md)
