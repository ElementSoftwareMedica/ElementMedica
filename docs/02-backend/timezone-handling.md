# Timezone Handling Guide

## Overview

ElementMedica operates in the **Europe/Rome** timezone (CET = UTC+1, CEST = UTC+2).  
All DateTime values in the database are stored as **UTC** by PostgreSQL/Prisma.

## Key Rules

### 1. Slot Disponibilità Times are LOCAL
`SlotDisponibilita.oraInizio` and `SlotDisponibilita.oraFine` are stored as `String` (HH:MM) in **local Italian time** (CET/CEST), NOT UTC.

### 2. Appointment `dataOra` is UTC
`Appuntamento.dataOra` is stored as `DateTime` in UTC. Example: `09:40 CET` → `08:40Z` in database.

### 3. Comparing Slot Times with Appointment Times
When building a time range from slot `oraInizio`/`oraFine` to filter appointments:

```javascript
// ❌ WRONG: Date.UTC treats slot times as UTC (1 hour off in winter!)
const startRange = new Date(Date.UTC(year, month, day, startH, startM, 0, 0));

// ✅ CORRECT: Local Date constructor matches how appointments are created
const startRange = new Date(year, month, day, startH, startM, 0, 0);
// JavaScript auto-converts to UTC internally (CET 09:25 → 08:25Z)
```

### 4. Full Day Ranges (Filtering by Date)
For full-day ranges, `Date.UTC` is acceptable since midnight UTC covers the full day:

```javascript
// ✅ OK for full day range
const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));    // 00:00Z
const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999)); // 23:59Z
```

### 5. YYYY-MM-DD String Parsing (Backend)
Use `parseToStartOfDay` / `parseToEndOfDay` from `backend/utils/dateUtils.js`:
- Detects `YYYY-MM-DD` format and uses local Date constructor
- Detects ISO strings with `Z` suffix and uses UTC

### 6. Frontend Time Display
`formatTime()` from `src/utils/dateUtils.ts` uses `toLocaleTimeString('it-IT')` which correctly converts UTC → local in the browser.

### 7. Session Date vs Slot Date
`QueueSession.date` may have timezone offset. Always prefer `slotDisponibilita.data` as the authoritative date:

```javascript
const effectiveDate = session.slotDisponibilita?.data
    ? new Date(session.slotDisponibilita.data)
    : new Date(session.date);
```

## Server Timezone
- **Development**: macOS system timezone (CET/Europe/Rome)
- **Production**: Docker containers — ensure `TZ=Europe/Rome` is set
- `process.env.TZ` is NOT explicitly set; relies on system default
- Verify with: `node -e "console.log(new Date().getTimezoneOffset());"` → `-60` (CET) or `-120` (CEST)

## Common Pitfalls
1. Using `Date.UTC()` with local HH:MM slot times → 1-2 hour offset
2. Using `session.date` instead of `slotDisponibilita.data` → wrong date (timezone shift)
3. Using `.getUTCHours()` for display → shows UTC time, not local
4. Mixing `cognome`/`nome` vs `firstName`/`lastName` field names across APIs
