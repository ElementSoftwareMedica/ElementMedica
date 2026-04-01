# 📅 Calendario Module

**Modulo calendario clinico per gestione disponibilità e appuntamenti**

---

## 📁 Struttura Directory

```
src/pages/clinica/agenda/
├── CalendarioPage.tsx          # Componente principale (~1671 LOC)
├── README.md                   # Questa documentazione
│
├── types/
│   ├── calendar.types.ts       # Tipi TypeScript (214 LOC)
│   └── index.ts                # Re-exports
│
├── constants/
│   └── index.ts                # Costanti (146 LOC)
│
├── utils/
│   ├── dateUtils.ts            # Utility date (218 LOC)
│   ├── timeUtils.ts            # Utility orari (211 LOC) - includes minutesToTimeString
│   ├── colorUtils.ts           # Utility colori (90 LOC)
│   ├── overbookingUtils.ts     # Calcolo overbooking (88 LOC)
│   └── index.ts                # Re-exports
│
├── hooks/
│   ├── useCalendarData.ts      # Query TanStack (280 LOC)
│   ├── useCalendarState.ts     # State UI (265 LOC)
│   ├── useSedeClosures.ts      # Orari apertura sede e chiusure speciali (265 LOC) ✨ NEW
│   └── index.ts                # Re-exports
│
└── components/
    ├── index.ts                # Re-exports centralizzato
    │
    ├── blocks/
    │   ├── DisponibilitaBlock.tsx   # Blocco disponibilità (385 LOC)
    │   ├── AppuntamentoBlock.tsx    # Blocco appuntamento (400 LOC)
    │   ├── DragDropPreview.tsx      # Preview drag & drop (95 LOC)
    │   └── index.ts                 # Re-exports
    │
    ├── grid/
    │   ├── TimeColumn.tsx           # Colonna orari (75 LOC)
    │   ├── DayColumn.tsx            # Colonna giorno/ambulatorio (420 LOC) - includes isHourOpen
    │   └── index.ts                 # Re-exports
    │
    ├── panels/
    │   ├── MiniCalendar.tsx         # Calendario navigazione (210 LOC)
    │   ├── FilterPanel.tsx          # Filtri laterali (480 LOC)
    │   └── index.ts                 # Re-exports
    │
    └── modals/
        ├── AppointmentBookingModal/ # Modal prenotazione (~1540 LOC)
        ├── AvailabilitySlotModal.tsx
        ├── EditDisponibilitaModal.tsx
        ├── AppointmentDetailModal.tsx
        ├── AmbulatorioOverviewPanel.tsx
        ├── types.ts
        └── index.ts                 # Re-exports
```

---

## 🎯 Tipi Principali

### `CalendarEvent`
Evento calendario unificato (disponibilità o appuntamento):
```typescript
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    tipo: 'disponibilita' | 'appuntamento';
    stato?: StatoAppuntamento;
    paziente?: string;
    medicoId?: string;
    ambulatorioId?: string;
    // ... altri campi
}
```

### `ColorScheme`
Schema colori per medici/ambulatori:
```typescript
interface ColorScheme {
    bg: string;      // es. 'bg-teal-100'
    border: string;  // es. 'border-teal-300'
    text: string;    // es. 'text-teal-800'
    dot: string;     // es. 'bg-teal-500'
}
```

### `ZoomMode`
Modalità zoom visualizzazione:
```typescript
type ZoomMode = 'scroll' | 'fixed';
```

---

## 🧩 Componenti Estratti

### Blocks

| Componente | Descrizione | Props Principali |
|------------|-------------|------------------|
| `DisponibilitaBlock` | Blocco disponibilità medico | `event`, `onClick`, `onDelete`, `colorScheme` |
| `AppuntamentoBlock` | Blocco appuntamento paziente | `event`, `onClick`, `onDelete`, `columnIndex` |
| `DragPreview` | Preview durante creazione slot | `startHour`, `endHour`, `color` |
| `DropPreview` | Preview durante spostamento | `startHour`, `durationMinutes`, `type` |

### Grid

| Componente | Descrizione | Props Principali |
|------------|-------------|------------------|
| `TimeColumn` | Colonna orari laterale | `startHour`, `endHour`, `hourHeight` |
| `DayColumn` | Colonna singolo giorno | `date`, `ambulatorio`, `disponibilita`, `appuntamenti`, `isHourOpen` |

### Panels

| Componente | Descrizione | Props Principali |
|------------|-------------|------------------|
| `MiniCalendar` | Calendario navigazione date | `currentMonth`, `selectedDates`, `onDateToggle` |
| `FilterPanel` | Pannello filtri completo | `ambulatori`, `medici`, `filterMedici`, `onZoomChange` |

---

## 🔧 Utility Functions

### Date Utils (`utils/dateUtils.ts`)
```typescript
formatDateISO(date: Date): string      // "2026-01-03"
formatDateIT(date: Date): string       // "03/01/2026"
getDayName(date: Date): string         // "Ven"
getWeekDates(startDate: Date): Date[]  // Array 7 date
isSameDay(d1: Date, d2: Date): boolean
isToday(date: Date): boolean
```

### Time Utils (`utils/timeUtils.ts`)
```typescript
timeToMinutes(time: string): number       // "08:30" → 510
minutesToTime(minutes: number): TimeSlot  // 510 → {hour: 8, minute: 30}
formatTimeRange(start: Date, end: Date): string
generateTimeSlots(start: number, end: number, interval: number): TimeSlot[]
```

### Overbooking Utils (`utils/overbookingUtils.ts`)
```typescript
minutesToTimeString(minutes: number): string  // 510 → "08:30"
calculateOverbookingColumns(appointments: CalendarEvent[]): OverbookingColumn[]
```

### Color Utils (`utils/colorUtils.ts`)
```typescript
getMedicoColor(index: number): ColorScheme
getAmbulatorioColor(index: number): ColorScheme
createMedicoColorMap(medici: Medico[]): Map<string, ColorScheme>
```

---

## 🪝 Custom Hooks

### `useCalendarData`
Query dati calendario da API:
```typescript
const {
    ambulatori,
    medici,
    slots,
    appuntamenti,
    isLoading,
    error,
    refetch
} = useCalendarData({ startDate, endDate });
```

### `useCalendarState`
State UI e persistenza localStorage:
```typescript
const {
    viewStartHour,
    viewEndHour,
    zoomMode,
    selectedDates,
    filterMedici,
    setZoomRange,
    setZoomMode,
    // ... altri setter
} = useCalendarState();
```

---

## 📦 Costanti

```typescript
// Layout
HOUR_HEIGHT = 60           // px per ora
FIVE_MIN_HEIGHT = 10       // px per 5 minuti
MIN_COLUMN_WIDTH = 50      // px larghezza minima colonna
TIME_COLUMN_WIDTH = 56     // px colonna orari

// Overbooking
MAX_OVERBOOKING_COLUMNS = 3

// Orari default
DEFAULT_START_HOUR = 8
DEFAULT_END_HOUR = 13

// Preset orari
TIME_PRESETS = {
    mattina: { start: 8, end: 13 },
    pomeriggio: { start: 14, end: 19 },
    giornata: { start: 7, end: 21 }
}

// Colori stati
STATO_COLORS: Record<StatoAppuntamento, string>

// Palette medici (8 colori)
MEDICO_COLORS: ColorScheme[]

// Palette ambulatori (8 colori)
AMBULATORIO_COLORS: ColorScheme[]
```

---

## 🚀 Uso

### Import Centralizzato
```typescript
// Tipi
import { CalendarEvent, ZoomMode, ColorScheme, ColorMode } from './types';

// Costanti
import { HOUR_HEIGHT, MEDICO_COLORS, TIME_PRESETS, CALENDAR_SETTINGS_KEY } from './constants';

// Utils
import { formatDateISO, isSameDay, getWeekDates } from './utils/dateUtils';
import { minutesToTimeString } from './utils/timeUtils';

// Hooks
import { useCalendarData, useCalendarState, useSedeClosures } from './hooks';

// Componenti
import { DisponibilitaBlock, DayColumn, FilterPanel } from './components';
```

---

## 📝 Note Sviluppo

### Modularizzazione Completata ✅
- ✅ Types estratti e centralizzati
- ✅ Constants estratti (HOUR_HEIGHT, MEDICO_COLORS, STATO_COLORS, TIME_PRESETS, etc.)
- ✅ Utils estratti (date, time, color, overbooking)
- ✅ Hooks estratti (data, state, **sedeClosures** ✨ NEW)
- ✅ Components blocks estratti (DisponibilitaBlock, AppuntamentoBlock, DragDropPreview)
- ✅ Components grid estratti (TimeColumn, DayColumn con isHourOpen)
- ✅ Components panels estratti (MiniCalendar, FilterPanel)
- ✅ Modals estratti (AppointmentBookingModal, AvailabilitySlotModal, etc.)
- ✅ CalendarioPage refactored per usare componenti e moduli estratti
- ✅ Rimossa cartella `calendario/` ridondante
- ✅ Rimosso codice duplicato (tipi, costanti, utils) dal file principale

### Risultati Modularizzazione
| Metrica | Prima | Dopo | Riduzione |
|---------|-------|------|-----------|
| CalendarioPage LOC | 5807 → 3624 → 1965 | **1671** | -71% |
| Inline Components | 8 | 0 | -100% |
| Duplicate Code | ~295 LOC | 0 | -100% |
| Build Size | 118.93 kB | **117.90 kB** | -0.9% |
| Build Time | ~13s | ~13s | stabile |

### Nuove Funzionalità Aggiunte
- 🏢 **Filtro Sede**: Filtra ambulatori per sede con visualizzazione orari
- ⏰ **Ore Chiuse**: Visualizzazione grigia ore fuori orario sede
- 🎄 **Chiusure Speciali**: Badge per festivi, ferie, ponti (ricorrenti e non)
- 📅 **Chiusure Parziali**: Supporto orari parziali di apertura
- 🪝 **useSedeClosures Hook**: Logica centralizzata per orari sede e chiusure

### File Principale
Il file `CalendarioPage.tsx` è stato ridotto a ~1671 LOC con:
- Importazione moduli centralizzata (types, constants, utils, hooks)
- Logica business (query, mutations, handlers)
- Orchestrazione componenti
- Render JSX principale

---

## 🔗 Riferimenti

- [Master Plan](../../../docs/10_project_managemnt/46_code_optimization_deep_restructure/47_calendario_page_master_plan.md)
- [Copilot Instructions](../../../.github/copilot-instructions.md)

---

**Ultimo aggiornamento**: 4 gennaio 2026
