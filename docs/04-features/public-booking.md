# P67 - Prenotazioni Online Pubbliche

## Overview
Sistema per permettere ai pazienti di prenotare appuntamenti attraverso un frontend pubblico, senza autenticazione.

## Schema Database

### SlotDisponibilita - Nuovi Campi

| Campo | Tipo | Default | Descrizione |
|-------|------|---------|-------------|
| `visibilePubblico` | Boolean | false | Se visibile nel frontend pubblico |
| `prenotabileOnline` | Boolean | false | Se prenotabile online (vs solo telefono) |
| `maxPrenotazioni` | Int | 1 | Numero massimo prenotazioni per slot |
| `anticipoMinimoOre` | Int | 0 | Ore minime anticipo per prenotare |
| `anticipoMassimoGiorni` | Int | 90 | Giorni massimi anticipo per prenotare |
| `durataSlotMinuti` | Int? | null | Durata slot (null = usa durata prestazione) |

## API Pubbliche

Base URL: `/api/public/booking` o `/api/v1/public/booking`

### GET /slots
Recupera slot disponibili per prenotazione.

**Query Parameters:**
- `dataInizio` - Data inizio (ISO8601)
- `dataFine` - Data fine (ISO8601, default +90 giorni)
- `prestazioneId` - Filtra per prestazione
- `medicoId` - Filtra per medico
- `ambulatorioId` - Filtra per ambulatorio
- `limit` - Max risultati (default 100)

**Response:**
```json
{
  "success": true,
  "data": [{
    "id": "uuid",
    "data": "2026-02-10",
    "oraInizio": "09:00",
    "oraFine": "12:00",
    "postiDisponibili": 3,
    "orariPrenotabili": ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
    "durataMinuti": 30,
    "medico": { "id": "...", "nome": "Dott. Rossi Mario" },
    "ambulatorio": { "id": "...", "nome": "Ambulatorio 1" },
    "prestazione": { "id": "...", "nome": "Visita Cardiologica" }
  }],
  "count": 10
}
```

### GET /slots/:slotId/times
Recupera orari prenotabili per uno slot specifico.

### POST /validate
Valida una richiesta di prenotazione prima di crearla.

**Body:**
```json
{
  "slotId": "uuid",
  "oraPrenotazione": "09:30"
}
```

### GET /prestazioni
Recupera prestazioni che hanno slot pubblici disponibili.

### GET /medici
Recupera medici con slot pubblici disponibili.

## Logica Orari Prenotabili

Gli orari prenotabili sono calcolati automaticamente:

```
Slot: 09:00-12:00
Durata Prestazione: 30 min
Orari Validi: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30
```

Un paziente NON può prenotare alle 10:15 se la durata è 30 minuti - solo slot multipli della durata.

## Service Methods

### SlotDisponibilitaService

- `getPublicSlots(tenantId, options)` - Recupera slot pubblici con filtri
- `calculateBookingTimes(oraInizio, oraFine, durataMinuti)` - Calcola orari validi
- `validatePublicBooking(slotId, oraPrenotazione, tenantId)` - Valida richiesta prenotazione

## Sicurezza

- Route NON richiedono autenticazione (pubbliche)
- Usano `publicContentMiddleware` per tenant resolution da dominio
- Rate limiting applicato
- Validate con express-validator
- CSRF exempt (whitelist in api-server.js)

## Uso Frontend

```typescript
// Fetch slot disponibili
const response = await fetch('/api/public/booking/slots?prestazioneId=uuid');
const { data: slots } = await response.json();

// Ogni slot ha orariPrenotabili già calcolati
slots[0].orariPrenotabili // ["09:00", "09:30", "10:00", ...]

// Valida prima di prenotare
const validation = await fetch('/api/public/booking/validate', {
  method: 'POST',
  body: JSON.stringify({ slotId: 'uuid', oraPrenotazione: '09:30' })
});
```

## Configurazione Slot

Per abilitare prenotazioni pubbliche su uno slot:

```javascript
await prisma.slotDisponibilita.update({
  where: { id: slotId },
  data: {
    visibilePubblico: true,      // Visibile pubblicamente
    prenotabileOnline: true,     // Prenotabile online
    maxPrenotazioni: 3,          // Max 3 prenotazioni
    anticipoMinimoOre: 24,       // Almeno 24h prima
    anticipoMassimoGiorni: 60,   // Max 60 giorni prima
    durataSlotMinuti: 30         // Slot ogni 30 min
  }
});
```

## Migration SQL

```sql
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "visibile_pubblico" BOOLEAN DEFAULT false;
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "prenotabile_online" BOOLEAN DEFAULT false;
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "max_prenotazioni" INTEGER DEFAULT 1;
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "anticipo_minimo_ore" INTEGER DEFAULT 0;
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "anticipo_massimo_giorni" INTEGER DEFAULT 90;
ALTER TABLE "slot_disponibilita" ADD COLUMN IF NOT EXISTS "durata_slot_minuti" INTEGER;

CREATE INDEX IF NOT EXISTS "idx_slot_disponibilita_pubblico" 
ON slot_disponibilita ("tenantId", visibile_pubblico, prenotabile_online, data) 
WHERE "deletedAt" IS NULL AND disponibile = true;
```

## Frontend Pubblico — Stato Implementazione

| Step | Stato | Componente |
|------|-------|------------|
| Pagina catalogo prestazioni prenotabili | ✅ | `PrenotaPage.tsx` — hero, card servizi, CTA |
| Componente calendario disponibilità | ✅ | `BookingCalendarIsland.tsx` — wizard 6-step, settimana Mon-Sat |
| Form prenotazione con validazione | ✅ | Step 5 del wizard (nome, CF, telefono, email, note) |
| Pagina conferma prenotazione | ✅ | Step 6 del wizard (schermo successo + numeroPrenotazione) |
| Email conferma paziente | ✅ | `EmailService.sendAppointmentConfirmation()` invocata dopo creazione (S35) |
| Pagina gestione prenotazione (modifica/cancella) | ⬜ | Bassa priorità — richiede token management link |
