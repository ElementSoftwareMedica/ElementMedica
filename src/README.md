# Indice del Progetto ElementSoftware

## Struttura Generale

```
src/
├── api/                   # API condivise tra componenti
├── app/                   # Componenti App Router (Next.js)
├── components/            # Componenti React organizzati per funzionalità
├── config/                # Configurazione centralizzata dell'applicazione
├── constants/             # Costanti dell'applicazione
├── context/               # Context React per lo stato globale
├── data/                  # Dati statici e di esempio
├── hooks/                 # Hook React personalizzati
├── lib/                   # Utility e funzioni di supporto
├── pages/                 # Pagine dell'applicazione
├── services/              # Servizi di comunicazione con le API
├── shared/                # Codice condiviso con il backend
├── styles/                # Stili CSS e configurazione Tailwind
└── types/                 # Definizioni TypeScript
```

## Componenti

I componenti sono organizzati per funzionalità e tipo:

- `design-system/` - Sistema di design con componenti riutilizzabili (Atomic Design)
- `components/shared/` - Componenti condivisi tra varie funzionalità
- `components/{feature}/` - Componenti specifici per ogni funzionalità

Componenti principali:
- `Layout.tsx` - Layout principale dell'applicazione
- `Header.tsx` - Header dell'applicazione
- `Sidebar.tsx` - Barra laterale di navigazione

## Servizi API

I servizi API sono implementati con un pattern factory per standardizzare le chiamate:

- `services/api.ts` - Funzioni di base per le chiamate HTTP
- `services/serviceFactory.ts` - Factory per la creazione dei servizi
- `services/{entity}.ts` - Servizi specifici per ogni entità

## Hook Personalizzati

Gli hook sono suddivisi in categorie:

- `hooks/api/` - Hook per la comunicazione con le API
- `hooks/use{Entity}.ts` - Hook per gestire dati di entità specifiche
- `hooks/use{Feature}.ts` - Hook per funzionalità UI (selezione, ordinamento, ecc.)

## Pagine

Le pagine sono organizzate per entità:

- `pages/{entity}/` - Pagine relative a ciascuna entità (elenco, dettaglio, modifica)
- `pages/settings/` - Pagine di configurazione dell'applicazione
- `Dashboard.tsx` - Dashboard principale

## Configurazione

La configurazione è centralizzata in:

- `config/api/index.ts` - Configurazione endpoints API
- `config/index.ts` - Configurazione generale dell'applicazione
- `constants/` - Costanti e valori predefiniti

## Context

I context React per lo stato globale:

- `context/AppStateContext.tsx` - Stato dell'applicazione
- `context/AuthContext.tsx` - Autenticazione e autorizzazione
- `context/ToastContext.tsx` - Notifiche toast

## Tipi TypeScript

Le definizioni dei tipi sono centralizzate in:

- `types/index.ts` - Definizioni condivise
- `types/courses.ts` - Definizioni specifiche per i corsi