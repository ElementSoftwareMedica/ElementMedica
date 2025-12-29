# Planning Operativo: Corsi, Companies, Import CSV e Frontend Pubblico

Ultimo aggiornamento: 2025-09-08

Obiettivo: implementare e consolidare i nuovi campi dei Corsi (riskLevel, courseType), garantire coerenza UI/UX su tutta l’app, migliorare l’import CSV con verifica unicità del codice, introdurre card unica nel frontend pubblico e risolvere il logout imprevisto durante l’update dei corsi.

1) Scope e Deliverable
- Fix autenticazione: l’update corso non deve causare logout o reset del TenantContext.
- Corsi: campi chiave
  - riskLevel: ALTO, MEDIO, BASSO (compatibile A/B/C), opzionale ma validato
  - courseType: PRIMO_CORSO o AGGIORNAMENTO
  - code: univoco per tenant (vincolo unico e gestione duplicati nell’import)
- UI/UX
  - Riordino campi Course e Companies nei form e nelle liste
  - Pagine corsi (/courses, /corsi, /courses/:id) e schedule aggiornate con riskLevel e courseType
- Import CSV corsi
  - Verifica duplicati su code (UI e backend)
  - Normalizzazione valori (numerici, riskLevel, courseType)
  - Report chiaro su cosa viene creato/aggiornato/saltato
- Frontend pubblico
  - Card unica “corso” con varianti (rischio, tipo) e diverse durate/costi
- Documentazione
  - Planning (questo documento), note di deploy, troubleshooting sintetico, user notes

2) Stato attuale (snapshot)
- Autenticazione/API
  - Response interceptor aggiornato per evitare logout “hard” su 401/403 non-auth dopo retry/refresh; comportamento severo mantenuto su /auth/verify.
  - RBAC: allineati i permessi per ADMIN/SUPER_ADMIN includendo courses:read/create/edit/update/delete per evitare 403 su PUT /api/v1/courses/:id.
- Backend schema
  - Il model Course include già riskLevel, courseType e unique su code (verificato in schema Prisma).
- Frontend
  - Tipi Course includono riskLevel e courseType
  - Lista Corsi: aggiunte colonne riskLevel e courseType
  - Import Corsi: normalizzazione riskLevel/courseType, detection duplicati via uniqueField=code, passaggio overwriteIds al backend
- Backend Import
  - Aggiunto pre-check duplicati su /courses/bulk-import con report strutturato: duplicati nel payload (code normalizzati) e duplicati già presenti in DB; la risposta include report con conteggi e dettagli. Non cambia il comportamento di createMany (skipDuplicates).

3) Piano di Lavoro (task e priorità)
A. Fix autenticazione (High)
- Verifica end-to-end aggiornamento corso con token scaduto e 401/403: nessun logout/reset TenantContext
- Test di regressione su login/refresh/verify

B. Schema e API (High)
- Conferma schema esistente (riskLevel, courseType, unique code) e migrazioni sincronizzate in tutti gli ambienti
- API corsi: garantire che GET/POST/PUT/DELETE trattino riskLevel/courseType e validazioni

C. Frontend Types e Form (High)
- Riordino form Course e Companies: categorie, sezioni, suggerimenti placeholder
- Courses list/table: visibilità riskLevel, courseType, filtri e badge
- Schedules: surface delle proprietà corso (riskLevel/courseType) nel wizard e riepiloghi

D. Import CSV Corsi (High)
- UI: evidenza duplicati code con selezione overwrite (già presente)
- Backend: pre-check duplicati code e skip/report dettagliato; accettare overwriteIds per update di massa (se richiesto)
- Messaggistica: conteggi creati/aggiornati/saltati e motivazioni

E. Frontend Pubblico (Medium)
- Card unica per corso con varianti rischio/tipo, costi e durate
- URL SEO-ready (slug), campi SEO
- Vista dettaglio: selettore variante e pricing

F. Documentazione e Deploy (High)
- Aggiornare docs di deploy (variabili env, migrazioni), troubleshooting (401/403), user (import CSV procedure)
- Note GDPR: minimizzazione dati, gestione token sicura, no hard-coding credenziali

4) Sequenza Operativa
1. QA fix auth su update corso (locale) -> validazione che il TenantContext non venga resettato
2. Conferma schema e API: controlli velocemente endpoints e validazioni
3. UI: consolidare form e liste (corsi/aziende) con nuovi campi e filtri
4. Import CSV: rifiniture su check duplicati lato backend e messaggi
5. Frontend pubblico: card unica e dettaglio varianti
6. Documentazione sintetica e check ambienti (localhost/Hetzner + Supabase)

5) QA e Test Plan
- Autenticazione: update corso con token scaduto; verify fallito solo per /auth/verify; nessun redirect/clear refresh token
- Corsi API: PUT /api/v1/courses/:id con ADMIN deve rispondere 200 (non 403); controllare che i campi vengano persistiti.
- Corsi UI: creare/aggiornare corso con riskLevel/courseType; filtri e colonne visibili e coerenti
- Import CSV:
  - File con mix di nuovi e duplicati; verificare report.report.duplicates.inPayload e .inDatabase e conteggi creati/skippati
  - Verificare che skipDuplicates di Prisma protegga i vincoli unici senza errori
- Public: card unica, selettore variante, prezzi/durate differenti; controllare SEO fields

6) Rischi e Mitigazioni
- Incoerenza tra env: assicurare migrazioni e variabili env coerenti (no hard-coding)
- Duplicati cross-tenant: validazioni e indici compositi se necessario (code + tenantId)
- Regressioni auth: test mirati su interceptor e su /auth/verify

7) Note di Implementazione
- Architettura modulare e file brevi; riuso componenti esistenti
- Nessun bypass privilegi (anche per admin) – a regime i permessi admin per i corsi dovranno essere garantiti anche a livello DB/seed (no scorciatoie).
- Configurazione via environment (frontend 5173, api 4001, proxy 4003)

8) Prossime Azioni Immediati
- Eseguire QA sull’update corso per chiudere il fix auth e verificare fine dei 403 su PUT
- Verificare via UI l’esito dell’import con il nuovo report e adeguare la messaggistica lato frontend se necessario
- Preparare miglioramenti backend dell’import per messaggistica duplicati e (eventuale) overwrite

## Aggiornamento 2025-09-08 — Import Corsi e permessi
- FATTO:
  - Backend: POST /courses/bulk-import ora richiede autenticazione + RBAC `courses:create` e forza `tenantId` dalla sessione (ignora `tenantId` nel payload). Duplicati controllati per tenant.
  - Documentazione tecnica aggiornata in <mcfile name="api-reference.md" path="/Users/matteo.michielon/project 2.0/docs/technical/api/api-reference.md"></mcfile> (requisiti auth/RBAC e payload senza `tenantId`).
  - Manuale admin aggiornato in <mcfile name="admin-manual.md" path="/Users/matteo.michielon/project 2.0/docs/user/admin-manual.md"></mcfile> (nota sicurezza import e `tenantId` CSV ignorato).
  - Troubleshooting aggiornato in <mcfile name="common-issues.md" path="/Users/matteo.michielon/project 2.0/docs/troubleshooting/common-issues.md"></mcfile> con sezione su `tenantId` mancante e fix applicato.
- IN CORSO:
  - QA end-to-end senza logout: verifica aggiornamento corso (PUT) e import CSV con duplicati; raccolta log 403 se presenti.
  - UI raggiungibile su :5173 (200 su / e /login). Procedere con login dalla UI e verificare redirect a /dashboard e presenza session cookie.
- DA FARE:
  - (Facoltativo) Pannello dettagli duplicati nel modal import (elenco espandibile record scartati con motivazione).
  - Verifica via `/api/v1/auth/verify` che il ruolo ADMIN esponga `courses:read/create/edit/update/delete` e allineamento completo middleware.
  - Validazione finale coerenza `req.person.permissions` vs permissionMap di verify e token issuance.
- Backend Import: pre-check duplicati su code normalizzato implementato in <mcfile name="localRoutes.js" path="/Users/matteo.michielon/project 2.0/backend/proxy/routes/localRoutes.js"></mcfile> con report dettagliato (inPayload/inDatabase) e createMany skipDuplicates attivo.
- Documentazione tecnica: aggiunta sezione API <mcfile name="api-reference.md" path="/Users/matteo.michielon/project 2.0/docs/technical/api/api-reference.md"></mcfile> per POST /courses/bulk-import con esempio response e report duplicati.
- Frontend: su <mcfile name="CoursesPage.tsx" path="/Users/matteo.michielon/project 2.0/src/pages/courses/CoursesPage.tsx"></mcfile> mostrato toast di riepilogo post-import (inviati/validi/creati/saltati) e preview codici duplicati trovati (payload/DB).

## Prossime azioni (QA & UX)
- QA UI: verificare che l'import mostri il toast con duplicati quando presenti e che non blocchi l'inserimento valido.
- QA API: confermare che il campo `report` (o `precheckReport` legacy) sia presente e coerente con i duplicati reali.
- Miglioria UX (facoltativa): aggiungere pannello dettaglio nel modal con elenco duplicati espandibile.

## Vincoli operativi (promemoria)
- Non riavviare server né cambiare porte (frontend 5173, api 4001, proxy 4003).
- Nessun bypass di permessi, anche per admin; RBAC courses:* aggiornato e attivo.
- Configurazioni via variabili d'ambiente; no hard-coding.

--
Questo planning rimarrà aggiornato con spunte e note di avanzamento durante l’implementazione.