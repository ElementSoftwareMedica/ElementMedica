# P100 - Audit trasversale processi E2E

Data: 2026-05-21

## Obiettivo

Valutare i processi applicativi principali in modo trasversale, confrontando pagina, modal, hook/service frontend e API backend, per individuare:

- problemi tecnici correggibili subito;
- differenze di logica da sottoporre a revisione;
- buchi funzionali in cui la stessa operazione è disponibile solo in una parte dell'app.

## Perimetro analizzato

Sono stati controllati staticamente i flussi più sensibili e ricorrenti:

- fatturazione elettronica e note di credito;
- preventivi e generazione documenti da corsi/schedule;
- movimenti contabili;
- appuntamenti, calendario, dettaglio appuntamento e modal di prenotazione;
- visite, modulistica, questionari e giudizi;
- aziende, sedi, servizi MDL e card operative;
- HR management;
- documenti formazione: lettere, registri, attestati;
- client desktop e sync, per coerenza con i flussi web già estesi in precedenza;
- superfici cyber trasversali: risposte HTTP, endpoint pubblici, risoluzione tenant, log frontend e upload.

## Correzioni implementate

### Fatturazione elettronica

Problema: la funzione "storna e rifai" era disponibile nella scheda rapida di fatturazione, ma non nella pagina principale delle fatture.

Intervento:

- aggiunto comando "Rifai" su fatture `EMESSA` e `PAGATA` nella pagina principale;
- riutilizzato il flusso esistente `stornaERifai`, con conferma utente, toast e refresh di lista/statistiche;
- mantenuto il blocco di eliminazione diretta alle sole bozze.

File:

- `src/pages/finance/billing/FatturazioneElettronicaPage.tsx`

### Appuntamenti

Problema: l'eliminazione appuntamento era un soft-delete sanitario/contabile, ma non richiedeva un motivo e non scriveva audit GDPR dedicato. Inoltre un modal chiamava "Annulla appuntamento" una funzione che eliminava l'appuntamento. La logica `NO_SHOW` e `ANNULLATO` era anche fusa in alcuni filtri.

Intervento:

- l'API frontend invia sempre un `deletionReason` anche dai punti esistenti;
- il controller backend valida il motivo minimo;
- il service backend registra `GdprAuditLog` con utente, risorsa, motivo e metadati operativi;
- il dominio evento di cancellazione riceve il motivo reale;
- il modal dettaglio calendario ora mostra "Elimina appuntamento" invece di "Annulla appuntamento".
- `NO_SHOW` resta uno stato visibile e tracciato con audit di cambio stato;
- `ANNULLATO` non è più una transizione operativa visibile: la disdetta telefonica passa dall'eliminazione soft-delete;
- le liste appuntamenti nascondono di default eventuali record legacy `ANNULLATO` non eliminati.

File:

- `src/services/clinicaApi.ts`
- `backend/controllers/clinica/appuntamentiController.js`
- `backend/services/clinical/AppuntamentoService.js`
- `src/pages/clinica/agenda/components/modals/AppointmentDetailModal.tsx`

### Preventivi

Problema: l'eliminazione del preventivo faceva soft-delete senza motivo operativo e senza audit GDPR, mentre movimenti, fatture e visite usano già un pattern più forte. Inoltre il blocco su `FATTURATO` non distingueva se esistesse davvero un movimento contabile fatturato collegato.

Intervento:

- il backend richiede `deletionReason` su DELETE preventivo;
- il soft-delete e l'audit vengono eseguiti nella stessa transazione;
- hook e service frontend usano DELETE con payload;
- le eliminazioni singole, massive e dai documenti schedule mantengono compatibilità tramite motivo standard.
- se il preventivo ha movimenti contabili `FATTURATO` o `PAGATO`, il backend chiede una decisione;
- la UI chiede se stornare i movimenti collegati oppure eliminare il preventivo senza storno;
- in caso di storno, i movimenti collegati passano a `STORNATO`.

File:

- `backend/routes/preventivi/crud.routes.js`
- `src/hooks/finance/usePreventivi.ts`
- `src/services/preventiviService.ts`
- `src/pages/finance/preventivi/PreventiviPage.tsx`

### Documenti formazione

Problema: lettere incarico, registri presenze e attestati usavano soft-delete, ma non distinguevano fra documento firmato e non firmato.

Intervento:

- se il documento è firmato, l'eliminazione genera `GdprAuditLog`;
- se il documento non è firmato, l'eliminazione genera audit applicativo (`ActivityLog`);
- mantenuto il soft-delete e il tenant check;
- per i cataloghi operativi resta sufficiente audit applicativo o log applicativo, senza obbligo generalizzato di motivo GDPR.

File:

- `backend/routes/attestati/crud.routes.js`
- `backend/routes/registri-presenze-routes.js`
- `backend/routes/lettere-incarico-routes.js`

### HR

Problema: mansioni interne e profili HR inviavano il motivo di eliminazione in query string. Per le mansioni interne il backend leggeva il body, quindi la cancellazione poteva fallire; per i profili HR funzionava, ma esponeva il motivo nell'URL.

Intervento:

- mansioni interne e profili HR ora inviano il motivo nel body tramite DELETE con payload;
- eliminato il passaggio del motivo in query string.

File:

- `src/pages/management/hr/api.ts`

### Helper API

Problema: `apiDeleteWithPayload` non fondeva in modo robusto gli header custom con `Content-Type`. Questo poteva rompere operazioni cross-tenant o DELETE con payload e header dedicati.

Intervento:

- normalizzato il merge header;
- preservato `Content-Type: application/json`;
- mantenuto il supporto agli header custom.

File:

- `src/services/api.ts`

### Cybersicurezza applicativa

Problema: alcune superfici restituivano al client messaggi derivati direttamente dall'eccezione, oppure accettavano dati sensibili di contesto dal payload pubblico. Questo aumenta il rischio di leakage tecnico/GDPR e di tenant spoofing nei form pubblici.

Intervento:

- rimosso `error.message` dalle risposte HTTP nei punti analizzati e sostituito con messaggi statici;
- mantenuti i dettagli tecnici solo nei log server strutturati;
- rimosso il body dai log di risoluzione scadenze automatiche, perché può contenere dati operativi o personali;
- il tenant delle submission pubbliche avanzate e dei form pubblici ora deriva da `publicContentMiddleware` o dall'utente autenticato, non dal body;
- aggiunto rate limiting e autenticazione opzionale al submit avanzato pubblico;
- normalizzati gli errori item-level del cambio stato massivo movimenti contabili;
- normalizzato l'upload media CMS per non restituire al client messaggi grezzi del parser file;
- l'ErrorBoundary mostra i dettagli tecnici solo in sviluppo, non in produzione;
- ridotti i log frontend in produzione su error boundary, API client, analytics, contact form, preventivi, throttling e permessi avanzati.

File:

- `backend/controllers/scadenze.controller.js`
- `backend/controllers/personController.js`
- `backend/routes/clinica/pazienti.routes.js`
- `backend/routes/clinica/queue.routes.js`
- `backend/routes/clinica/mansioni.routes.js`
- `backend/controllers/advancedSubmissionsController.js`
- `backend/routes/advanced-submissions-routes.js`
- `backend/controllers/formsController.js`
- `backend/routes/forms-routes.js`
- `backend/routes/cms-media-routes.js`
- `backend/routes/clinica/nomine-ruolo.routes.js`
- `backend/routes/movimento-contabile-routes.js`
- `src/components/ui/ErrorBoundary.tsx`
- `src/services/api.ts`
- `src/services/apiClient.ts`
- `src/services/requestThrottler.ts`
- `src/services/contactSubmissions.ts`
- `src/services/preventiviService.ts`
- `src/services/cmsAnalyticsService.ts`
- `src/services/logs.ts`
- `src/services/advanced-permissions/AdvancedPermissionsService.ts`
- `src/pages/clinica/agenda/CalendarioPage.tsx`
- `src/pages/clinica/agenda/hooks/useSedeClosures.ts`
- `src/pages/clinica/clinica/VisitaPage.tsx`

## Differenze logiche risolte

Queste differenze erano state segnalate per revisione e sono state risolte dopo conferma.

### Annulla vs elimina appuntamento

Decisione applicata:

- `NO_SHOW` = paziente non presentato senza preavviso, record visibile e tracciato;
- `ANNULLATO` = disdetta gestita come eliminazione soft-delete con motivo, record non visibile nelle liste operative.

### Documenti formazione

Decisione applicata:

- documento firmato: audit GDPR;
- documento non firmato: audit applicativo.

### Sedi, cataloghi e configurazioni

Molte entità catalogo o configurazione usano soft-delete semplice: sedi, listini, prestazioni, ambulatori, strumenti, convenzioni, template. Non tutte devono necessariamente chiedere un motivo, ma oggi il criterio non è documentato in modo uniforme.

Decisione applicata:

- dati sanitari/personali/contabili: motivo e audit obbligatori;
- documenti formazione firmati: audit GDPR;
- documenti formazione non firmati: audit applicativo;
- cataloghi operativi: audit applicativo sufficiente;
- configurazioni tecniche: audit applicativo sufficiente.

### Preventivi fatturati

Decisione applicata:

- il backend verifica i movimenti contabili realmente collegati;
- se trova movimenti `FATTURATO` o `PAGATO`, la UI chiede se stornarli;
- la cancellazione senza storno resta possibile se l'utente sceglie di mantenere invariati i movimenti.

## Gap funzionali individuati

- Il flusso fattura aveva una disparità reale fra pagina principale e quick tab: corretto.
- Il flusso appuntamento aveva delete funzionante da più punti, ma senza motivo/audit coerente: corretto.
- Il flusso HR aveva invio motivo non allineato al backend: corretto.
- I documenti formazione avevano audit non uniforme fra firmato/non firmato: corretto.
- Il criterio "annulla stato" vs "elimina record" negli appuntamenti è stato reso coerente con la decisione di prodotto.
- I form pubblici non possono più determinare il tenant tramite payload client: il mapping pubblico resta centralizzato sul middleware brand/tenant.

## Gap cyber residui da pianificare

- Completare una matrice endpoint pubblici con CSRF/rate limiting/widget settings per ogni rotta public/embed.
- Standardizzare una utility backend per errori HTTP sicuri, così i nuovi endpoint non reintroducono `error.message` in risposta.
- Valutare Content Security Policy e reporting frontend per sostituire parte dei log console con telemetry controllata.
- Eseguire test automatici dedicati per tenant spoofing sui form pubblici e per assenza di stack/error raw nelle risposte.

## Verifiche eseguite

- `git diff --check` sui file modificati: OK.
- Controllo sintattico Node su:
  - `backend/routes/preventivi/crud.routes.js`
  - `backend/controllers/clinica/appuntamentiController.js`
  - `backend/services/clinical/AppuntamentoService.js`
  - `backend/routes/attestati/crud.routes.js`
  - `backend/routes/registri-presenze-routes.js`
  - `backend/routes/lettere-incarico-routes.js`
  - `backend/controllers/scadenze.controller.js`
  - `backend/controllers/personController.js`
  - `backend/routes/clinica/pazienti.routes.js`
  - `backend/routes/clinica/queue.routes.js`
  - `backend/routes/clinica/mansioni.routes.js`
  - `backend/controllers/advancedSubmissionsController.js`
  - `backend/routes/advanced-submissions-routes.js`
  - `backend/routes/cms-media-routes.js`
  - `backend/routes/clinica/nomine-ruolo.routes.js`
  - `backend/routes/movimento-contabile-routes.js`
  - `backend/controllers/formsController.js`
  - `backend/routes/forms-routes.js`
- `npm run build`: OK.
- `./scripts/build-production.sh`: OK per Element Sicurezza ed Element Medica.
- Deploy produzione eseguito il 2026-05-21:
  - frontend `dist/` pubblicato su `elementsicurezza.com`;
  - frontend `dist-public/` pubblicato su `elementmedica.com`;
  - backend pubblicato su `/var/www/elementmedica/backend`;
  - backup remoto creato prima della sostituzione;
  - `npx prisma migrate status`: schema database aggiornato, nessuna migrazione pendente;
  - `api-server` e `documents-server` riavviati e online.
- Verifiche post-deploy:
  - health API backend: OK;
  - health document server: OK;
  - domini `www.elementsicurezza.com`, `www.elementmedica.com`, `elementsicurezza.com`: OK;
  - redirect `elementmedica.com`: OK;
  - login applicativo su dominio produzione: OK;
  - asset frontend aggiornati caricati dai due domini: OK;
  - endpoint pubblici prenotazione `/api/v1/public/booking/prestazioni` e `/api/v1/public/booking/sedi`: OK.

Note build:

- Vite segnala dati Browserslist non aggiornati.
- Vite segnala un circular chunk `mui -> forms -> mui` già nella logica di chunking.
- In produzione i log applicativi continuano a mostrare errori ricorrenti di autenticazione `AcubeAPI` e polling SDI: sono preesistenti al deploy e vanno trattati come tema di configurazione/integrazione fatturazione elettronica.
- `npm ci --production` sul server segnala vulnerabilità di dipendenze da pianificare in un intervento dedicato.
- La rotta legacy `/api/public/booking/...` risponde 401; il frontend attuale usa correttamente la rotta canonica `/api/v1/public/booking/...`.

## Note operative

- Le modifiche sono state tenute mirate sui punti con bug o gap tecnici chiari.
- Non sono state alterate modifiche preesistenti nel worktree.
- Il deploy automatico via script si è fermato sull'utente SSH `elementmedica`; il rilascio è stato completato via accesso server già disponibile, senza modificare infrastruttura, firewall o configurazioni cloud.
