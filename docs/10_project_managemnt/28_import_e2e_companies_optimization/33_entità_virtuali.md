# 33 Entità Virtuali

Obiettivo: Differenziazione virtuale Person / Employee / Trainer con RBAC field-level e CSV export.

Stato avanzamento
- Fatto:
  - Route unificate per persons, employees, trainers, users (con auth, authorize, auditLog)
  - Endpoint GET /api/persons/:id/fields-visibility: restituisce per campo { visible, editable } + liste visibleFields/editableFields + defaults + meta
  - Dettaglio GET /api/persons/:id: meta _visibility include visibleFields e editableFields
  - Export CSV/JSON coerente con view e allowedFields
  - Test unit/integration aggiornati: virtual-entities e personController passano
  - Allineato conteggio aziende in dashboard: /api/counters ora conta le aziende non cancellate per tenant (rimosso filtro isActive; mantenuti tenantId e deletedAt=null)
  - ScheduleEventModal/CourseDetailsForm: migliorata barra di ricerca corsi con normalizzazione (accenti/simboli) e filtro client-side sul dropdown; aggiunti placeholder guida e reset coerente dell'input.
  - ScheduleEventModal: abilitato il pulsante "Avanti" anche quando il corso selezionato non prevede rischio/tipo/sottotipi (autoselezione della prima variante disponibile quando opportuno).
  - TrainerSelector/ScheduleEventModal: filtro formatori più tollerante per certificazioni (normalizzazione + substring match) e UI con evidenza dei non qualificati; coperti i casi "primo soccorso".
- Da fare:
  - Smoke test UI end-to-end su ScheduleEventModal (ricerca corsi, autoselezione rischio/tipo quando assenti, filtro/selection formatori) e correzione di eventuali edge case.
  - Verifica manuale login locale e gestione 401 su /api/v1/auth/verify in sviluppo (richiede autenticazione per testare la modale). Nessun cambio porte/riavvio automatico.
  - Acceptance test UI per form dinamici (create/edit) per view employee/trainer/person.
  - Copertura edge cases su role hierarchy filters lato lista (/employees, /trainers).
  - Dashboard: verifica UI/QA per StatCard cliccabili e coerenza link (/companies, /employees, /schedules, /courses).
  - Pagina modifica Trainer: rifinitura layout/stile, icone coerenti e verifica UX della sezione certificazioni.

Acceptance criteria sintetici
- /employees e /trainers applicano filtri server per gerarchia ruoli
- /persons/:id/fields-visibility ritorna
  - allowed=true
  - visibleFields: string[]
  - editableFields: string[]
  - fields: Record<field, { visible: boolean; editable: boolean }>
  - defaults: string[]
- /persons/:id ritorna _visibility con visibleFields e editableFields
- Export:
  - GET /api/persons/export?view=employee|trainer produce CSV coerente con allowedFields calcolati
  - Content-Disposition filename include suffix _employee/_trainer

Note operative
- Nessun bypass admin nei controlli; rispetto GDPR (no log di credenziali)
- Funziona sia in localhost sia su Hetzner con Supabase (config via env)

Changelog operativo correlato (ultimo aggiornamento)
- Backend: aggiornato conteggio aziende in /api/counters per coerenza con lista (soft-delete e per-tenant).
- Frontend: rese cliccabili le StatCard del Dashboard con link verso le pagine: Aziende, Dipendenti, Schedules e Corsi; migliorata la modale ScheduleEvent (ricerca corsi normalizzata, abilitazione "Avanti" senza sottotipi, filtro formatori tollerante). In attesa di verifica visiva/QA.
- Prossimi step: smoke test modale schedule + acceptance test, migliorare layout/stile pagina modifica Trainer e validazione/selezione certificazioni; aggiornare documentazione selettiva se emergono nuove dipendenze o comandi.