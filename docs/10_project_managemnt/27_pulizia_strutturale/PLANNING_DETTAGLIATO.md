# Progetto 27 – Pulizia strutturale e organizzazione modulare (non invasiva)

Obiettivo: pulizia graduale e sicura dell’albero del progetto (root, backend, frontend e relative sottocartelle), senza modificare codice o rimuovere funzionalità, mantenendo tutto perfettamente funzionante e comprensibile in modo modulare.

Nota di sicurezza: questo progetto NON contiene credenziali. Le credenziali non saranno mai scritte nella documentazione o nel codice. Verranno gestite unicamente tramite variabili d’ambiente e segreti CI/CD.

---

## Guardrail e riferimenti

- Seguire rigorosamente:
  - /.trae/TRAE_SYSTEM_GUIDE.md
  - /.trae/rules/project_rules.md
  - Requisiti GDPR aziendali e template GDPR dove necessari
- Zero regressioni funzionali, zero downtime in produzione, nessun cambio porte server fisse: API 4001, Proxy 4003, Frontend 5173, Documents 4002
- Nessun inserimento/eliminazione di funzionalità. Focus esclusivo su ordine, chiarezza, manutenibilità, eliminazione file temporanei/duplicati/superflui, senza toccare il comportamento applicativo
- Niente segreti nel repo, niente log con segreti

---

## Stato attuale (sintesi)

- Produzione attiva su Hetzner e HTTPS funzionante; health check OK per /health e /api/health
- Pagine pubbliche verificate online: /medicina-del-lavoro e /rspp OK
- Infrastruttura docker-compose di produzione presente (docker-compose.production.yml), Nginx configurato (nginx/production.conf, nginx/frontend.conf)
- Backend modulare con server separati e routing avanzato (Proxy 4003 → API 4001 / Documents 4002)
- Test e strumenti locali presenti in root: test_local_api.cjs, test_vite_proxy.js, test-production.sh, scripts/health-check.sh, oltre a cartelle tests/ e playwright-report/

---

## Ambito e principi di intervento

- Intervento graduale per batch, con test pre/post
- Priorità all’identificazione e gestione di file temporanei, build artifacts, report volatili e duplicati
- Nessun refactor di codice applicativo nella fase di pulizia non invasiva; eventuali miglioramenti tecnici verranno proposti separatamente con planning e test dedicati

---

## Baseline tecnica locale (da usare per verifica continua)

- Test minimi obbligatori (da TRAE_SYSTEM_GUIDE):
  - curl http://localhost:4001/health
  - curl http://localhost:4003/health
  - Login admin standard su /api/auth/login via Proxy (porta 4003)
  - Routing avanzato: /routes/health, /routes/stats
  - CORS OPTIONS su /api/auth/login da Origin http://localhost:5173
- Verifiche pagine protette (quando utenti con permessi sono attivi): companies, employees, courses, trainers, con relative pagine dettaglio e import per ciascuna entità

Nota: l’avvio locale dei server seguirà i comandi documentati nel repo (es. backend/start-servers.sh, vite, ecc.). Ogni esecuzione verrà accompagnata da test di salute e login standard.

---

## Inventario iniziale e candidati alla pulizia (non invasiva)

Candidati tipici (da confermare con test):
- Build artifacts e file di stato: tsconfig.*.tsbuildinfo, tsconfig.tsbuildinfo, test-results/.last-run.json
- Output di strumenti di test/esecuzione: playwright-report/, tenants_response.json (se file di output temporaneo), .cookies_test/
- Report o CSV diagnostici: docs/test_conflicts.csv (spostare in sottocartelle di progetto dedicate, se necessari)
- Script "fix-*" e "test_*" in root/scripts/ che potrebbero essere consolidati o documentati meglio; nessuna rimozione ora, solo classificazione

Azioni previste (solo documentali in questa fase):
- Classificazione file per categoria: necessario a runtime/build, necessario a sviluppo, temporaneo (da rigenerare), storico/diagnostico
- Proposta di rilocazione nelle cartelle corrette previste dalle regole (docs/10_project_managemnt/[progetto]/test|debug|temp) per artefatti temporanei

---

## Piano di lavoro – Fase 1 (Capire dove siamo)

Deliverable di Fase 1:
1) Analisi stato attuale e baseline tecnica (questo documento)
2) Inventario root/backend/frontend con classificazione preliminare file
3) Definizione criteri di pulizia non invasiva e check-list di test di non regressione

Criteri accettazione Fase 1:
- Documento baseline creato e allineato ai guardrail
- Lista candidati alla pulizia redatta (senza rimozione)
- Piano test di verifica locale pronto

---

## Criteri di pulizia non invasiva (linee guida)

- Non rimuovere né spostare file se non chiaramente temporanei/rigenerabili o report volatili
- Nessuna modifica al codice applicativo (ts/tsx/js) e alle configurazioni operative critiche
- Ogni spostamento verrà effettuato in batch con test prima/dopo
- Nessun cambiamento di porte, endpoint o behavior
- Documentare ogni intervento in questa cartella progetto

---

## Prossimi passi (Fase 2)

- Inventario dettagliato root/backend/src/scripts/nginx/monitoring (classificazione Necessario/Temporaneo/Storico)
- Definizione Batch 1 di pulizia (solo file chiaramente temporanei o duplicati)
- Esecuzione Batch 1 con test locali (health, login, routing) e verifica pagine companies, employees, courses, trainers
- Aggiornare questo documento con risultati e decisioni

---

## Rischi e mitigazioni

- Rischio regressione per rimozione file utili: mitigato con approccio conservativo e test prima/dopo
- Rischio gestione credenziali: mitigato evitando di riportarle in documenti/codice e usando .env/.secrets
- Rischio disallineamento documentazione: mitigato con aggiornamenti continui in questa cartella progetto