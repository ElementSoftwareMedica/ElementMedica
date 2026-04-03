# ElementMedica Desktop - MDL Offline-First

Applicazione desktop Electron per la gestione offline delle visite di Medicina del Lavoro.

## Setup Sviluppo

```bash
cd desktop-app
npm install
npm run dev
```

## Architettura

- **Main process** (`src/main/`): Electron, SQLite, IPC handlers, auto-updater
- **Preload** (`src/preload/`): contextBridge securo tra main e renderer
- **Renderer** (`src/renderer/`): React app con componenti condivisi dalla webapp
- **Adapters** (`src/renderer/adapters/`): Layer che intercetta API calls e li instrada online/offline

## Componenti Condivisi

I componenti UI sono importati direttamente dalla webapp (`../src/`) tramite alias Vite `@/`.
Questo significa che qualsiasi modifica alla webapp si riflette automaticamente nel desktop.

## Build

```bash
npm run build           # Build Vite
npm run package:win     # Build + installer Windows
```

## Riferimenti

- [P98 Project Doc](../docs/08-projects/P98_MDL_DESKTOP_OFFLINE.md)
- [P56 MDL Completo](../docs/08-projects/P56_MDL_COMPLETO.md)
