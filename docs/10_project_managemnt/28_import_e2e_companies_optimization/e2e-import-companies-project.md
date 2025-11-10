# Progetto: Import E2E Aziende (CSV → API → DB)

Scopo
- Completare e rendere affidabile l’import da CSV delle aziende end-to-end, rimuovendo i campi duplicati da Company e mantenendoli in CompanySite. Funzionamento identico in locale e in produzione (Hetzner + Supabase).

Stato attuale (sintesi)
- Modal FE apre ma caricamento lento; toast successo ma DB non popolato (bug riprodotto).
- Backend: route /companies/import disponibile; aggiunta sanitizzazione e transazioni atomiche Company + CompanySite; logging strutturato con importId e duration; gestione duplicati P.IVA/CF e riattivazione soft-delete.
- Prisma: schema con duplicati presenti in Company (da migrare). CompanySite completo.

Deliverable
- PR con modifiche FE, BE e schema Prisma + script migrazione.
- Test unitari e integrazione; report import con log e conteggi.
- Template CSV aggiornato e documentazione sintetica.

Checklist attività
Frontend
- [ ] Parsing CSV veloce (streaming/worker) e validazioni campo/record
- [ ] Mappatura campi aggiornata (senza duplicati Company) + feedback errori per riga
- [ ] Invio a batch con retry/idempotenza + progress bar e resume
- [ ] Allineamento header Authorization + X-Tenant-ID

Backend/API
- [x] Sanitizzazione campi: spostare campi di sede su CompanySite (alias legacy inclusi)
- [x] Transazioni atomiche: prisma.$transaction per Company + CompanySite (create/update/riattivazione)
- [x] Logging strutturato: importId, durationMs, conteggi, error details per riga (senza PII sensibile)
- [ ] Idempotenza robusta su chiavi uniche e overwriteIds (verificare casi limite)
- [ ] Report dettagliato in risposta (batch, processed, failed con reason/field/row)

Prisma & Migrazione dati
- [ ] Piano migrazione: rimuovere da Company i duplicati (citta, indirizzo, cap, provincia, telefono, mail, personaRiferimento, sedeAzienda)
- [ ] Script migrazione: consolidare dati esistenti in CompanySite
- [ ] Allineamento Supabase (tipi e constraint); migrazioni applicabili in entrambi gli ambienti

Supabase / Deployment
- [ ] Verifica constraint/indici e performance su insert bulk
- [ ] Confronto ambienti dev/prod; nessuna hard-coded config, solo env vars

QA / E2E
- [ ] CSV di test (50/500/5k righe) con mix create/update/soft-deleted/duplicati
- [ ] E2E locale: login → POST /api/v1/companies/import → verifica DB e UI
- [ ] E2E produzione: stesso flusso via proxy (porte fisse)
- [ ] Report finale con KPI: durata parsing, batch inviati, create/update, sitesCreated, errori

Criteri di accettazione
- Parsing reattivo e progressivo; anteprima + progress + report finale all’utente
- Creazione corretta di Company e relative CompanySite
- Nessun campo duplicato in Company né nel modal né nel template CSV
- Funzionamento identico in dev e prod; nessun bypass; porte invariate

Prossimi passi
- [ ] FE: introdurre worker/streaming nel modal di import e progress bar
- [ ] BE: migliorare report errori per riga e idempotenza overwrite
- [ ] Prisma: preparare migrazione e script dati; dry-run in locale, poi Supabase
- [ ] QA: scenari E2E con CSV campione; confronto tempi e scalabilità

Note operative
- Rispettare `.trae/TRAE_SYSTEM_GUIDE.md` e `.trae/rules/project_rules.md` e GDPR
- Evitare log con PII sensibile; nessuna credenziale in chiaro
- Non riavviare server né cambiare porte: chiedere al maintainer quando necessario