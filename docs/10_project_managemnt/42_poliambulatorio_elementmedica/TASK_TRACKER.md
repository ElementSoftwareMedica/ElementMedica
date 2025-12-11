# 📋 TRACCIAMENTO TASK - Poliambulatorio ElementMedica

## Come Usare Questo Documento
Spunta i checkbox `[x]` man mano che completi i task.

---

## FASE 0: INFRASTRUTTURA (5 giorni)

### F0.1 Multi-Domain Setup
- [ ] F0.1.1 Configurazione DNS domini
- [ ] F0.1.2 Certificati SSL multi-domain
- [ ] F0.1.3 Test routing domini

### F0.2 Frontend Split
- [ ] F0.2.1 Configurazione Vite multi-entry
- [ ] F0.2.2 Shared components library
- [ ] F0.2.3 Test build separati

### F0.3 Auth Multi-Frontend
- [ ] F0.3.1 Middleware tenant domain-aware
- [ ] F0.3.2 JWT shared con domain claim
- [ ] F0.3.3 Test cross-domain auth

---

## FASE 1: DATABASE (14 giorni)

### F1.1 Struttura Core
- [ ] F1.1.1 Modello Poliambulatorio
- [ ] F1.1.2 Modello Sede + Indirizzo
- [ ] F1.1.3 Migration + seed base
- [ ] F1.1.4 Test CRUD base

### F1.2 Ambulatori
- [ ] F1.2.1 Modello Ambulatorio
- [ ] F1.2.2 Modello OrarioAmbulatorio
- [ ] F1.2.3 Migration + seed
- [ ] F1.2.4 Test isolamento tenant

### F1.3 Strumentario
- [ ] F1.3.1 Modello Strumento
- [ ] F1.3.2 Modello ManutenzioneStrumento
- [ ] F1.3.3 Migration + seed
- [ ] F1.3.4 Test relazioni

### F1.4 Catalogo Prestazioni
- [ ] F1.4.1 Modello Prestazione
- [ ] F1.4.2 Modello TemplateCampoVisita
- [ ] F1.4.3 Migration + seed
- [ ] F1.4.4 Test associazioni

### F1.5 Listini e Convenzioni
- [ ] F1.5.1 Modello Listino + ListinoPrestazione
- [ ] F1.5.2 Modello Convenzione + ConvenzioneListino
- [ ] F1.5.3 Modello CodiceSconto
- [ ] F1.5.4 Migration + seed

### F1.6 Agenda
- [ ] F1.6.1 Modello SlotDisponibilita
- [ ] F1.6.2 Modello Appuntamento
- [ ] F1.6.3 Modello NumeroChiamata
- [ ] F1.6.4 Migration + seed
- [ ] F1.6.5 Test slot conflicts

### F1.7 Clinica
- [ ] F1.7.1 Modello Visita
- [ ] F1.7.2 Modello ValoreCampoVisita
- [ ] F1.7.3 Modello Referto + VersioneReferto
- [ ] F1.7.4 Modello FirmaDigitale
- [ ] F1.7.5 Migration + seed

### F1.8 Audit e Sicurezza
- [ ] F1.8.1 Modello AuditLogClinico
- [ ] F1.8.2 Trigger audit automatici
- [ ] F1.8.3 Indexes ottimizzati

---

## FASE 2: BACKEND API (24 giorni)

### F2.1 Setup API Clinica
- [ ] F2.1.1 Router /api/v1/clinica setup
- [ ] F2.1.2 Middleware auditClinico
- [ ] F2.1.3 Validazione schemas Joi

### F2.2 API Struttura
- [ ] F2.2.1 CRUD Poliambulatorio
- [ ] F2.2.2 CRUD Sedi
- [ ] F2.2.3 CRUD Ambulatori
- [ ] F2.2.4 CRUD Orari Ambulatori
- [ ] F2.2.5 Test endpoints struttura

### F2.3 API Strumentario
- [ ] F2.3.1 CRUD Strumenti
- [ ] F2.3.2 CRUD Manutenzioni
- [ ] F2.3.3 Report ROI strumenti
- [ ] F2.3.4 Test endpoints

### F2.4 API Catalogo
- [ ] F2.4.1 CRUD Prestazioni
- [ ] F2.4.2 CRUD Template Campi Visita
- [ ] F2.4.3 API associazione prestazione-ambulatorio
- [ ] F2.4.4 API associazione prestazione-medico
- [ ] F2.4.5 Test endpoints catalogo

### F2.5 API Listini
- [ ] F2.5.1 CRUD Listini
- [ ] F2.5.2 CRUD Prezzi per listino
- [ ] F2.5.3 API applicazione sconti
- [ ] F2.5.4 Test calcolo prezzi

### F2.6 API Convenzioni
- [ ] F2.6.1 CRUD Convenzioni
- [ ] F2.6.2 API listini convenzionati
- [ ] F2.6.3 Verifica validità convenzione
- [ ] F2.6.4 Test endpoints

### F2.7 API Agenda Base
- [ ] F2.7.1 CRUD Slot Disponibilità
- [ ] F2.7.2 API calcolo disponibilità
- [ ] F2.7.3 API verifica conflitti
- [ ] F2.7.4 Test slot liberi

### F2.8 API Appuntamenti
- [ ] F2.8.1 CRUD Appuntamenti
- [ ] F2.8.2 API prenotazione con validazione
- [ ] F2.8.3 API cambio stato (workflow)
- [ ] F2.8.4 API accettazione paziente
- [ ] F2.8.5 API chiamata paziente
- [ ] F2.8.6 Test workflow completo

### F2.9 API Visite
- [ ] F2.9.1 CRUD Visite
- [ ] F2.9.2 API inizio/fine visita
- [ ] F2.9.3 API salvataggio campi
- [ ] F2.9.4 API template campi dinamici
- [ ] F2.9.5 Test flusso visita

### F2.10 API Referti
- [ ] F2.10.1 CRUD Referti
- [ ] F2.10.2 API versioning
- [ ] F2.10.3 API firma digitale
- [ ] F2.10.4 API generazione PDF
- [ ] F2.10.5 Test immutabilità firmato

### F2.11 API Documenti
- [ ] F2.11.1 Upload documenti clinici
- [ ] F2.11.2 Download con audit
- [ ] F2.11.3 Storage S3/GCS integration
- [ ] F2.11.4 Test upload/download

---

## FASE 3: FRONTEND BASE (12 giorni)

### F3.1 Setup Medica App
- [ ] F3.1.1 Entry point main.medica.tsx
- [ ] F3.1.2 Router App.medica.tsx
- [ ] F3.1.3 Layout shell MedicaLayout.tsx
- [ ] F3.1.4 Sidebar navigazione clinica

### F3.2 Theme Medica
- [ ] F3.2.1 Colori brand medica
- [ ] F3.2.2 Typography sanitaria
- [ ] F3.2.3 Varianti componenti medici

### F3.3 Components Clinici Base
- [ ] F3.3.1 PatientCard.tsx
- [ ] F3.3.2 AppointmentCard.tsx
- [ ] F3.3.3 StatusBadge clinico
- [ ] F3.3.4 ClinicalTimeline.tsx
- [ ] F3.3.5 SearchPatient.tsx

### F3.4 Services Frontend
- [ ] F3.4.1 clinicaApi.ts
- [ ] F3.4.2 appuntamentiApi.ts
- [ ] F3.4.3 visiteApi.ts
- [ ] F3.4.4 refertiApi.ts

### F3.5 Hooks Clinici
- [ ] F3.5.1 useAppuntamenti.ts
- [ ] F3.5.2 useDisponibilita.ts
- [ ] F3.5.3 useVisita.ts
- [ ] F3.5.4 useReferto.ts

### F3.6 Auth Medica
- [ ] F3.6.1 LoginMedica.tsx
- [ ] F3.6.2 Permission guards clinici
- [ ] F3.6.3 Role-based UI
- [ ] F3.6.4 Test accessi role-based

---

## FASE 4: MODULO STRUTTURA (9 giorni)

### F4.1 Dashboard Struttura
- [ ] F4.1.1 Overview card poliambulatorio
- [ ] F4.1.2 Lista sedi con stats
- [ ] F4.1.3 Quick actions struttura

### F4.2 Gestione Sedi
- [ ] F4.2.1 Lista sedi (GDPR template)
- [ ] F4.2.2 Form crea/modifica sede
- [ ] F4.2.3 Mappa Google sede
- [ ] F4.2.4 Test CRUD sedi

### F4.3 Gestione Ambulatori
- [ ] F4.3.1 Lista ambulatori per sede
- [ ] F4.3.2 Form crea/modifica ambulatorio
- [ ] F4.3.3 Gestione orari ambulatorio
- [ ] F4.3.4 Assegnazione strumentario
- [ ] F4.3.5 Test CRUD ambulatori

### F4.4 Gestione Strumentario
- [ ] F4.4.1 Inventario strumenti
- [ ] F4.4.2 Scheda strumento dettaglio
- [ ] F4.4.3 Calendario manutenzioni
- [ ] F4.4.4 Alert scadenze

---

## FASE 5: MODULO CATALOGO (9 giorni)

### F5.1 Gestione Prestazioni
- [ ] F5.1.1 Lista prestazioni (filtri)
- [ ] F5.1.2 Form crea/modifica prestazione
- [ ] F5.1.3 Associazione ambulatori
- [ ] F5.1.4 Associazione medici
- [ ] F5.1.5 Test CRUD prestazioni

### F5.2 Template Campi Visita
- [ ] F5.2.1 Form builder campi
- [ ] F5.2.2 Preview template
- [ ] F5.2.3 Drag&drop ordinamento
- [ ] F5.2.4 Test builder

### F5.3 Gestione Listini
- [ ] F5.3.1 Lista listini
- [ ] F5.3.2 Griglia prezzi per listino
- [ ] F5.3.3 Import/export Excel
- [ ] F5.3.4 Test calcoli

### F5.4 Gestione Convenzioni
- [ ] F5.4.1 Lista convenzioni
- [ ] F5.4.2 Form convenzione
- [ ] F5.4.3 Associazione listini
- [ ] F5.4.4 Verifica validità

---

## FASE 6: MODULO AGENDA (14 giorni)

### F6.1 Calendario Base
- [ ] F6.1.1 CalendarView (day/week/month)
- [ ] F6.1.2 Vista slot disponibili
- [ ] F6.1.3 Drag&drop appuntamenti
- [ ] F6.1.4 Filtri (medico/ambulatorio)

### F6.2 Gestione Disponibilità
- [ ] F6.2.1 Setup orari medico
- [ ] F6.2.2 Gestione eccezioni (ferie)
- [ ] F6.2.3 Copia pattern settimanale
- [ ] F6.2.4 Test conflitti

### F6.3 Booking Appuntamenti
- [ ] F6.3.1 Wizard step 1: paziente
- [ ] F6.3.2 Wizard step 2: prestazione
- [ ] F6.3.3 Wizard step 3: slot
- [ ] F6.3.4 Wizard step 4: conferma
- [ ] F6.3.5 Riepilogo + pagamento

### F6.4 Workflow Appuntamenti
- [ ] F6.4.1 Kanban stati
- [ ] F6.4.2 Quick actions
- [ ] F6.4.3 Note e storico
- [ ] F6.4.4 Test workflow

### F6.5 Accettazione
- [ ] F6.5.1 Dashboard segreteria
- [ ] F6.5.2 Check-in paziente
- [ ] F6.5.3 Privacy + consensi
- [ ] F6.5.4 Assegnazione numero

### F6.6 Sistema Chiamata
- [ ] F6.6.1 Monitor sala attesa
- [ ] F6.6.2 Pannello chiamata
- [ ] F6.6.3 Audio notifica
- [ ] F6.6.4 Test WebSocket

---

## FASE 7: MODULO CLINICA (16 giorni)

### F7.1 Dashboard Medico
- [ ] F7.1.1 Agenda giornaliera medico
- [ ] F7.1.2 Pazienti in attesa
- [ ] F7.1.3 Quick stats giornaliere
- [ ] F7.1.4 Notifiche urgenti

### F7.2 Flusso Visita
- [ ] F7.2.1 Scheda paziente pre-visita
- [ ] F7.2.2 Inizio visita (timer)
- [ ] F7.2.3 Form campi visita dinamici
- [ ] F7.2.4 Fine visita + riepilogo
- [ ] F7.2.5 Test flusso completo

### F7.3 Editor Referti
- [ ] F7.3.1 Editor WYSIWYG referto
- [ ] F7.3.2 Template con merge fields
- [ ] F7.3.3 Anteprima PDF real-time
- [ ] F7.3.4 Salvataggio bozza auto
- [ ] F7.3.5 Test editor

### F7.4 Firma Digitale
- [ ] F7.4.1 UI conferma firma
- [ ] F7.4.2 Validazione medico
- [ ] F7.4.3 Generazione PDF firmato
- [ ] F7.4.4 Test immutabilità

### F7.5 Storico Versioni
- [ ] F7.5.1 Timeline versioni
- [ ] F7.5.2 Diff tra versioni
- [ ] F7.5.3 Audit trail accessi
- [ ] F7.5.4 Test event sourcing

### F7.6 Cartella Paziente
- [ ] F7.6.1 Vista unificata paziente
- [ ] F7.6.2 Storico visite
- [ ] F7.6.3 Storico referti
- [ ] F7.6.4 Documenti allegati
- [ ] F7.6.5 Grafico trend

---

## FASE 8: FATTURAZIONE (7 giorni)

### F8.1 Fatture Prestazioni
- [ ] F8.1.1 Generazione fattura da visita
- [ ] F8.1.2 Applicazione listino/convenzione
- [ ] F8.1.3 Calcolo sconti
- [ ] F8.1.4 Preview fattura

### F8.2 Pagamenti
- [ ] F8.2.1 Registrazione pagamento
- [ ] F8.2.2 Multi-metodo
- [ ] F8.2.3 Ricevuta/scontrino
- [ ] F8.2.4 Test calcoli

### F8.3 Report Finanziari
- [ ] F8.3.1 Dashboard incassi
- [ ] F8.3.2 Report per periodo
- [ ] F8.3.3 Export contabilità
- [ ] F8.3.4 Statistiche medico/prestazione

---

## FASE 9: INTEGRAZIONI (7 giorni)

### F9.1 Notifiche Email
- [ ] F9.1.1 Template email conferma
- [ ] F9.1.2 Template email reminder
- [ ] F9.1.3 Template email referto
- [ ] F9.1.4 Queue invio asincrono

### F9.2 WhatsApp/SMS
- [ ] F9.2.1 Integrazione Twilio/WA
- [ ] F9.2.2 Template messaggi
- [ ] F9.2.3 Scheduler reminder
- [ ] F9.2.4 Gestione opt-out
- [ ] F9.2.5 Test invio

### F9.3 Calendario Esterno
- [ ] F9.3.1 Export ICS
- [ ] F9.3.2 Sync Google Calendar
- [ ] F9.3.3 Test sync

---

## FASE 10: SICUREZZA (5 giorni)

### F10.1 Audit Trail Completo
- [ ] F10.1.1 UI visualizzazione audit
- [ ] F10.1.2 Filtri avanzati audit
- [ ] F10.1.3 Export audit compliance
- [ ] F10.1.4 Test completezza

### F10.2 GDPR Features
- [ ] F10.2.1 Export dati paziente
- [ ] F10.2.2 Richiesta cancellazione
- [ ] F10.2.3 Consensi management
- [ ] F10.2.4 Test GDPR flow

### F10.3 Security Hardening
- [ ] F10.3.1 Rate limiting clinico
- [ ] F10.3.2 IP whitelist
- [ ] F10.3.3 Session management
- [ ] F10.3.4 Security audit finale

---

## FASE 11: TESTING (8 giorni)

### F11.1 Unit Tests
- [ ] F11.1.1 Tests services clinici
- [ ] F11.1.2 Tests validators
- [ ] F11.1.3 Tests hooks
- [ ] F11.1.4 Coverage report

### F11.2 Integration Tests
- [ ] F11.2.1 Tests API endpoints
- [ ] F11.2.2 Tests workflow appuntamenti
- [ ] F11.2.3 Tests workflow visite
- [ ] F11.2.4 Tests multi-tenancy

### F11.3 E2E Tests
- [ ] F11.3.1 Playwright prenotazione
- [ ] F11.3.2 Playwright visita
- [ ] F11.3.3 Playwright referto
- [ ] F11.3.4 Cross-browser

---

## FASE 12: DEPLOY (7 giorni)

### F12.1 Staging
- [ ] F12.1.1 Deploy staging medica
- [ ] F12.1.2 Data migration test
- [ ] F12.1.3 UAT stakeholders
- [ ] F12.1.4 Fix bug critici

### F12.2 Production
- [ ] F12.2.1 Deploy production
- [ ] F12.2.2 DNS switch
- [ ] F12.2.3 Monitoring setup
- [ ] F12.2.4 Backup verification

### F12.3 Go-Live Support
- [ ] F12.3.1 Training utenti
- [ ] F12.3.2 Documentazione utente
- [ ] F12.3.3 Support on-call
- [ ] F12.3.4 Hotfix rapidi

---

## 📊 PROGRESS TRACKER

| Fase | Completati | Totale | % |
|------|------------|--------|---|
| F0 | 0 | 9 | 0% |
| F1 | 0 | 28 | 0% |
| F2 | 0 | 44 | 0% |
| F3 | 0 | 21 | 0% |
| F4 | 0 | 15 | 0% |
| F5 | 0 | 15 | 0% |
| F6 | 0 | 24 | 0% |
| F7 | 0 | 24 | 0% |
| F8 | 0 | 11 | 0% |
| F9 | 0 | 11 | 0% |
| F10 | 0 | 11 | 0% |
| F11 | 0 | 12 | 0% |
| F12 | 0 | 12 | 0% |
| **TOTALE** | **0** | **237** | **0%** |
