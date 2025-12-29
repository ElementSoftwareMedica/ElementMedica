# 32 Ottimizzazione ScheduleEventModal

Aggiornamento stato al: 2025-09-10

## Fatto
- Uniformato layout del modal: ora max-w-4xl, altezza fissa h-[88vh] con max-h-[88vh], header con bordo inferiore e footer con bordo superiore; area contenuti con bordo grigio e sfondo bianco, min-h coerente tra gli step.
- Step 1: unificata selezione corso in AsyncSelect a pillola con ricerca asincrona da DB; Livello di Rischio e Tipo Corso a pillola e disabilitati fino a selezione corso (auto-compilati se definiti sul corso); Modalità di erogazione come dropdown a pillola; rimosso campo "Numero Massimo Partecipanti"; campo "Note" spostato in fondo; confermato summary del corso.
- Date/Orari (Step 1): corretto il rendering del dropdown date (react-datepicker) con locale italiana; input e controlli a stile pillola; mantenuta validazione ore rimanenti/durata corso.
- Step 3: in `AttendanceManager` uniformato styling `react-select` e prevenzione co-formatore uguale al formatore; confermata navigabilità tra date/sessioni e azioni Tutti/Nessuno.
- Step 2: layout due pannelli (Aziende a sinistra con search + Dipendenti a destra con search), selezione default della prima azienda attiva, pulsanti Seleziona/Deseleziona tutti; miglioramenti di UI coerenti (bordi, spacing, sfondi).
- Integrazione: wiring `onCourseSelected` in ScheduleEventModal per supportare corsi caricati asincroni e auto-fill di risk_level e course_type quando disponibili.
- Validazioni: confermata validazione ore selezionate == durata corso; controlli su date, orari, trainer per sessione, co-trainer diverso, aziende e partecipanti.
- Gestito 404 dell'endpoint `/api/public/courses/unified/:title` con fallback lato client: 1) risoluzione del titolo via `/api/public/courses/titles/list`, 2) raggruppamento locale a partire da `/api/public/courses`; migliorata la normalizzazione dei titoli per diacritici/punteggiatura.
- Test E2E: aggiornato smoke test (pulsante "Indietro" nascosto allo step iniziale) e aggiunto test Step 0 con compilazione campi e verifica riepilogo ore in DateTimeManager; mockati `/api/v1/schedules`, `/api/v1/companies`, `/api/v1/persons`.

## TODO
- Step 3: collegare riepilogo presenze finale con conferma (se necessario) e microcopy guide.
- Step 4: predisporre interfacce stub per preventivo, attestati, test e gestione presenze (solo UI placeholder senza logica backend).
- Uniformare ulteriormente stile con design system (palette e dimensioni bottoni) e aggiungere icone leggere dove utile.
- Aggiungere test di validazione unitari; estendere copertura e2e a Step 2-3-4 (aziende/persone, presenze, salvataggio) con verifica payload.
- Backend (opzionale): implementare endpoint `GET /api/public/courses/unified/:title` per performance/coerenza, allineato alle rotte correnti.

## Vincoli e note
- Non cambiare porte né riavviare server. Variabili ambiente per configurazioni, nessun hard-coding.
- GDPR: non loggare dati personali sensibili; nessuna credenziale in chiaro.
- Compatibilità: deve funzionare in localhost e su Hetzner con Supabase.

## Checklist di test
- Apertura `ScheduleEventModal` da Dashboard/Schedules.
- Step iniziale: pulsante "Indietro" non visibile; "Avanti" disabilitato finché il passo non è valido; abilitato dopo compilazione campi obbligatori.
- Selezione corso con e senza `riskLevel/courseType` predefiniti.
- Rischio e Tipo Corso: disabilitazione quando precompilati, selezione manuale quando non presenti.
- Riepilogo ore (DateTimeManager): aggiornato in tempo reale e coerente con durata corso.
- Aggiunta/rimozione sessioni e modifica orari; validazione che somma ore == durata corso.
- Selezione formatore filtrato per certificazioni e co-formatore libero (ma diverso dal formatore).
- Navigazione tra step; validazioni su campi obbligatori (corso, rischio, tipo, luogo, date, aziende, persone).
- Step 2: ricerca aziende e dipendenti, selezione/deselezione tutti, conteggi corretti.
- Salvataggio crea/aggiorna schedule con payload atteso (inclusi `risk_level`, `course_type`, `dates`, `company_ids`, `employee_ids`).