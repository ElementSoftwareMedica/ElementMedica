# 📅 Clinica - Calendario e Agenda

**Versione**: 2.5.0  
**Data**: 22 Gennaio 2026

---

## 📋 Overview

Il sistema di calendario gestisce:
- Appuntamenti per visite mediche
- Disponibilità medici
- Slot temporali per ambulatorio
- Prenotazioni online (quando abilitato)
- Notifiche automatiche

---

## 🏛️ Architettura

### Entità

```
Tenant
    │
    ├── Ambulatorio
    │       │
    │       └── Slot
    │               │
    │               └── Appuntamento
    │
    ├── Medico
    │       │
    │       └── MedicoDisponibilita
    │
    └── Paziente
            │
            └── Appuntamento
```

### Modelli Prisma

```prisma
model Ambulatorio {
  id          String   @id @default(uuid())
  tenantId    String
  nome        String
  descrizione String?
  colore      String   @default("#0d9488")
  isActive    Boolean  @default(true)
  deletedAt   DateTime?
  
  slots       Slot[]
  
  @@unique([tenantId, nome])
}

model Slot {
  id             String   @id @default(uuid())
  ambulatorioId  String
  medicoId       String?
  dataOra        DateTime
  durata         Int      @default(30)  // minuti
  stato          SlotStato @default(LIBERO)
  note           String?
  
  appuntamento   Appuntamento?
  ambulatorio    Ambulatorio @relation(...)
  medico         Medico? @relation(...)
}

model Appuntamento {
  id          String   @id @default(uuid())
  slotId      String   @unique
  pazienteId  String
  tipoVisita  TipoVisita
  stato       StatoAppuntamento
  note        String?
  confermatoIl DateTime?
  
  slot        Slot @relation(...)
  paziente    Person @relation(...)
}
```

---

## 📊 Stati Slot

| Stato | Descrizione | Colore |
|-------|-------------|--------|
| LIBERO | Disponibile per prenotazione | Verde |
| PRENOTATO | Appuntamento fissato | Blu |
| OCCUPATO | Visita in corso | Arancione |
| COMPLETATO | Visita completata | Grigio |
| ANNULLATO | Annullato | Rosso |
| BLOCCATO | Non disponibile | Grigio scuro |

---

## 📊 Stati Appuntamento

| Stato | Descrizione |
|-------|-------------|
| DA_CONFERMARE | In attesa di conferma |
| CONFERMATO | Confermato dal paziente |
| IN_CORSO | Visita in svolgimento |
| COMPLETATO | Visita conclusa |
| ANNULLATO | Annullato |
| NO_SHOW | Paziente non presentato |

---

## 🔗 API Endpoints

### Ambulatori

```
GET    /api/v1/clinica/ambulatori
POST   /api/v1/clinica/ambulatori
GET    /api/v1/clinica/ambulatori/:id
PUT    /api/v1/clinica/ambulatori/:id
DELETE /api/v1/clinica/ambulatori/:id
```

### Slot

```
GET    /api/v1/clinica/slots
POST   /api/v1/clinica/slots
PUT    /api/v1/clinica/slots/:id
DELETE /api/v1/clinica/slots/:id
POST   /api/v1/clinica/slots/generate
GET    /api/v1/clinica/slots/disponibili
```

### Appuntamenti

```
GET    /api/v1/clinica/appuntamenti
POST   /api/v1/clinica/appuntamenti
GET    /api/v1/clinica/appuntamenti/:id
PUT    /api/v1/clinica/appuntamenti/:id
DELETE /api/v1/clinica/appuntamenti/:id
POST   /api/v1/clinica/appuntamenti/:id/conferma
POST   /api/v1/clinica/appuntamenti/:id/annulla
POST   /api/v1/clinica/appuntamenti/:id/no-show
```

### Calendario

```
GET    /api/v1/clinica/calendario
GET    /api/v1/clinica/calendario/giornaliero
GET    /api/v1/clinica/calendario/settimanale
GET    /api/v1/clinica/calendario/mensile
```

---

## 📱 Pagine Frontend

| Pagina | Route | Descrizione |
|--------|-------|-------------|
| Calendario | `/poliambulatorio/calendario` | Vista calendario completo |
| Agenda | `/poliambulatorio/agenda` | Lista appuntamenti giornaliera |
| Ambulatori | `/poliambulatorio/ambulatori` | Gestione ambulatori |

---

## 🎨 Componenti

### AgendaCalendar

Vista calendario settimanale/mensile con:
- Drag & drop appuntamenti
- Click per creare nuovo appuntamento
- Filtri per medico/ambulatorio
- Colori per tipo visita

### AgendaTimeline

Vista timeline giornaliera con:
- Slot orari 15/30/60 minuti
- Colonne per ambulatorio
- Stati visivi appuntamenti

---

## ⚙️ Configurazioni

### Impostazioni Tenant

```json
{
  "calendario": {
    "durataPredefinitaSlot": 30,
    "oraInizio": "08:00",
    "oraFine": "20:00",
    "giorniLavorativi": [1, 2, 3, 4, 5],
    "intervalloSlot": 15,
    "prenotazioneMinAnticipoOre": 24,
    "prenotazioneMaxGiorni": 90,
    "confermaAutomatica": false,
    "notificheEmail": true,
    "notificheSMS": false
  }
}
```

---

## 📧 Notifiche

### Automatiche

| Evento | Email | SMS | Push |
|--------|-------|-----|------|
| Nuovo appuntamento | ✅ | opt | opt |
| Conferma | ✅ | opt | ✅ |
| Reminder 24h | ✅ | opt | ✅ |
| Reminder 1h | ❌ | opt | ✅ |
| Annullamento | ✅ | opt | ✅ |
| Modifica | ✅ | ❌ | ✅ |

---

## 🔄 Sincronizzazione

### Google Calendar (P57 - Future)

```javascript
// Configurazione per tenant
{
  googleCalendar: {
    enabled: false,  // Richiede feature flag
    syncDirection: "bidirectional",
    calendarId: "primary",
    colorMapping: {...}
  }
}
```

### iCal Export

Endpoint per export calendario:
```
GET /api/v1/clinica/calendario/ical?token=...
```

---

## 🔒 Permessi

| Azione | Permesso Richiesto |
|--------|-------------------|
| Visualizza calendario | `calendario:read` |
| Crea appuntamento | `appuntamenti:write` |
| Modifica appuntamento | `appuntamenti:write` |
| Annulla appuntamento | `appuntamenti:delete` |
| Gestione ambulatori | `ambulatori:write` |
| Configurazione slot | `slots:write` |
