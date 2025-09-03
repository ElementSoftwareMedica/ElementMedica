# ElementMedica 2.0 – Deployment & Workflow Planning

## 1) Contesto e vincoli
- Funzionalità locali intatte, nessuna modifica alle superfici sensibili (routing, api-server, proxy-server, RBAC, tenant, login/permessi/ruoli/gerarchie).
- GDPR: nessun secret in repository, variabili d’ambiente fuori controllo versione.
- Eliminazione e re-installazione ex-novo su Hetzner e GitHub gestite via script di provisioning e deploy (no modifiche manuali in produzione).

## 2) Obiettivi
- Garantire funzionamento locale invariato.
- Preparare infrastruttura di produzione su Hetzner: Nginx con HTTPS valido su `elementformazione.com` e `www.elementformazione.com`, con webroot per ACME.
- Definire flusso di sincronizzazione: sviluppo solo locale, test locali, quindi deploy su Hetzner e push su GitHub (storia repository ripulita ex-novo).

## 3) Piano operativo (alto livello)
1. Infrastruttura di produzione
   - Creare Nginx production config con HTTP→HTTPS, ACME webroot e SPA fallback.
   - Creare docker-compose.production.yml (nginx + certbot renew).
   - Script di provisioning Hetzner (installazione Docker/Compose, firewall 80/443, directories).
   - Script di deploy remoto (rsync codice, up stack, healthcheck).
2. Certificati TLS
   - Emissione iniziale con webroot: `elementformazione.com` e `www.elementformazione.com`.
   - Rinnovo automatico via container certbot.
3. Backend servizi
   - Una volta disponibili i sorgenti completi, integrare i container (api/proxy/docs) nel compose e aggiornare Nginx upstream/proxy_pass.
4. Sincronizzazione GitHub
   - Reinizializzazione repository con storia pulita; push forzato su `main` (solo dopo validazione locale e deploy riuscito).

## 4) Workflow standardizzato
- Sviluppo e test SOLO in locale.
- Verifiche obbligatorie: lint, build, test unit/integration (quando disponibili), avvio locale.
- Aggiornare `planning.md` ad ogni step completato.
- Deploy su Hetzner via script (mai modifiche manuali sul server).
- Se tutto OK in produzione, push finale su GitHub allineato allo stato locale.

## 5) Criteri/Guardrail
- Non toccare componenti sensibili (routing/API/tenant/RBAC/login) finché non saranno integrati come servizi separati; ogni modifica deve essere minima e reversibile.
- GDPR: nessun secret in repository; `.env.production` solo locale e trasferito in modo sicuro al server (non versionato).

## 6) Log di avanzamento
- [INIT] Creato il presente planning e definito piano operativo.
- [DONE] Creato `nginx/production.conf` con HTTP→HTTPS, ACME webroot e fallback SPA.
- [DONE] Creato `docker-compose.production.yml` (nginx + certbot-renew) e mount dist.
- [DONE] Creati script `scripts/provision-hetzner.sh` e `scripts/remote-deploy-hetzner.sh` per provisioning e deploy.
- [DONE] Provisioning Hetzner completato: Docker/Compose installati, UFW abilitato su 22/80/443, directories runtime create.
- [DONE] Pulizia vecchi container/reti in conflitto (porte 80/443 libere).
- [DONE] Deploy Nginx HTTP-only (frontend.conf): health OK su IP pubblico.
- [DONE] Emissione certificati Let's Encrypt via webroot per `elementformazione.com` e `www.elementformazione.com` (non-interattivo).
- [DONE] Switch a config `production.conf` con HTTPS attivo: health OK su HTTPS, redirect 301 da HTTP.
- [DONE] Integrazione backend (API/Proxy/Docs) nel compose e deploy riuscito: /api/health OK su HTTP e HTTPS.
- [DONE] Verifica esterna: `curl` su https://elementformazione.com/api/health e https://www.elementformazione.com/api/health restituisce `{"status":"healthy"}`.
- [DONE] Deploy remoto eseguito oggi: rsync progetto, upload .env, build api/documents/proxy, health interni, issue/renew cert, switch HTTPS, health HTTP/HTTPS OK.
- [INFO] In locale: API (4001), Docs (4002), Proxy (4003) OK su /health.
- [DONE] UI pubblica: confermato PublicButton (Link interni `to`, esterni `href`) e tracking CTA.
- [DONE] HomePage: card servizi ora cliccabili sull’intera card con navigazione programmata, accessibilità tastiera e tracking `cta_click` (no anchor nidificati).
- [DONE] SEO: aggiunti meta `og:site_name`, `og:locale`, `robots`, `theme-color` in PublicLayout.
- [DONE] Build frontend: vite build OK.
- [DONE] Health check: API (4001) e Proxy (4003) rispondono correttamente; routing avanzato `/routes/health` OK; legacy redirect `/login` 302.
- [DONE] Verifica in anteprima con Vite: navigazione Home → Corsi/RSPP/Medicina del Lavoro e CTA “Richiedi Preventivo” funzionanti; SEO centralizzato applicato (title/description/canonical/OG/Twitter/robots/theme-color).
- [DONE] Public og-image: aggiunto `public/og-image.svg` come immagine di default per social.
- [DONE] Tracking CTA: uniformato su Header, Hero, Home Services e ServiceCard con `trackCtaEvent`; ActivityLogsTab mostra eventi `public · cta_click` dal backend (fallback a mock se BE non disponibile).
- [INFO] Produzione: il dominio non risulta attualmente raggiungibile; da eseguire redeploy completo dopo configurazione GitHub Secrets.
- [INFO] Locale: build frontend OK (vite build), lint attuale FALLISCE con ~500+ errori principalmente @typescript-eslint/no-explicit-any; non blocca il deploy ma resta come attività di hardening post-ripristino prod.

## 7) Prossimi passi immediati
- GIT: stato pulito su branch main con remoto origin configurato. Preparare commit dei soli file di pianificazione aggiornati (no segreti) e push su main.
- CI/CD Secrets (GitHub): impostare obbligatoriamente HETZNER_SSH_HOST, HETZNER_SSH_USER, HETZNER_SSH_KEY (chiave privata), FRONTEND_URL, CORS_ALLOWED_ORIGINS, JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL, DIRECT_URL, REDIS_ENABLED (default false), PUBLIC_DOMAIN (opzionale, default www.elementformazione.com).
- Deploy: avviare workflow "Deploy to Hetzner (Production)" su push a main. In alternativa, eseguire localmente `scripts/remote-deploy-hetzner.sh <HOST> <USER>` con AUTO_PUSH_ENV=1 e backend/.env.production preparato.
- CORS/Origin: mantenere allineamento tra localhost (sviluppo), domini produzione e IP pubblico; verifica end-to-end con autenticazione.
- Automazione rinnovo certificati: confermare servizio `certbot-renew` attivo e log di rinnovo; valutare reload Nginx post-rinnovo (se necessario).
- Monitoraggio/Logging: verificare mount volumi logs/ ed eventuale retention.
- SEO: estendere PublicLayout con `og:image` e `twitter:image`, robots/canonical per tutte le pagine; aggiungere default image.
- Activity Logs: confermare endpoint BE e tracciamento CTA lato FE con sendBeacon fallback.
- Post-deploy: verificare /health e /api/health su HTTP/HTTPS e correggere eventuali problemi di configurazione.

Note operative:
- I file `.trae/rules/project_rules.md` e `.trae/TRAE_SYSTEM_GUIDE.md` risultano presenti nel repository; vengono rispettati (GDPR, niente segreti in VCS, modifiche minime e reversibili).

## 8) Analisi tecnica – Activity Logs (in corso)
- Modello ActivityLog (DB): campi effettivi confermati: id, personId (user_id), action, details (String JSON-encoded), timestamp, createdAt, deletedAt, updatedAt, tenantId; nessun campo resource/resourceId/ipAddress direttamente su ActivityLog.
- Modello GdprAuditLog (DB): include personId?, action, resourceType?, resourceId?, dataAccessed?, ipAddress?, userAgent?, companyId?, createdAt, deletedAt, tenantId. Usato per log GDPR via middleware audit.
- Frontend types: ActivityLog nel FE prevede resource, resourceId e ipAddress; mismatch con schema reale. In CMS alcuni log sono creati con prisma.activityLog.create inserendo resourceType/resourceId dentro details (JSON) e non in campi dedicati.
- Middleware tenant: publicRoutes definite; per rotte pubbliche salta risoluzione tenant. Per rotte non pubbliche estrae X-Tenant-ID o query.tenantId; gestione localhost vs domini prod già presente.
- Autenticazione: req.person?.id/req.person?.personId e req.person?.tenantId usati diffusamente; richiesto authenticate per GET private; necessario optionalAuth per POST pubblico.
- Versioning e routing: API server con version manager v1/v2; body parser applicato ai router versionati (fix V38 presente). Il proxy ha regole generiche /api/:version/* e /api/* quindi il nuovo endpoint è raggiungibile senza aggiunte esplicite.
- Validazioni: modulo validations/audit ha schemi Zod placeholders (TODO). Da definire CreateActivityLogSchema/QuerySchema per POST/GET.
- Audit middleware: auditLog scrive su gdprAuditLog con ipAddress/userAgent/path/metodo/dettagli; non su ActivityLog.

## 9) Decisioni e implicazioni
- Per evitare refactor lato FE immediato, il GET /api/v1/activity-logs mapperà i campi di risposta così:
  - resource = details.resourceType || details.resource || null
  - resourceId = details.resourceId || null
  - ipAddress = details.ipAddress || null (se in futuro salvato nei details)
  - user: { username, email } da relazione Person
- Il POST pubblico accetterà: action (string), resourceType?, resourceId?, details? (oggetto), userAgent/ipAddress opzionali; salverà in ActivityLog: action, details JSON.stringify({resourceType, resourceId, ...extra}). Nessun dato sensibile; rispetto GDPR.
- Tenant: obbligo X-Tenant-ID per POST pubblico; se assente, rifiutare 400 per contesti non pubblici. Su pagine pubbliche invieremo sempre X-Tenant-ID dal FE.

## 10) Piano implementazione endpoint /api/v1/activity-logs
- Endpoint
  - POST /api/v1/activity-logs (public, optionalAuth, tenant richiesto via header). Body validato con Zod.
  - GET /api/v1/activity-logs (private, authenticate + tenant). Supporto filtri: action?, personId?, dateFrom?, dateTo?, page?, pageSize?, sort?.
- Controller
  - POST: costruisce record ActivityLog con tenantId, personId (se autenticato), action, details JSON-encoded con resourceType/resourceId/ipAddress/userAgent e altri dettagli.
  - GET: query con paginazione e mapping risposta verso FE (resource/resourceId/ipAddress derivati dai details), include user {username,email}.
- Validazioni (Zod)
  - CreateActivityLogSchema: action (string, non vuota), resourceType/resourceId opzionali, details opzionale object, header X-Tenant-ID richiesto.
  - QueryActivityLogSchema: filtri e paginazione con default sensati, sort whitelist su timestamp/createdAt.
- Routing/API server
  - Registrare le rotte sul v1Router nel server API, con middleware: cors → rateLimit → optionalAuth/autenticate → tenant → controller.
- Sicurezza
  - Rate limit leggero sul POST pubblico; sanificazione campi details; nessun secret in log.

## 11) Test da eseguire – Activity Logs
- Health di base
  - curl http://localhost:4001/health
  - curl http://localhost:4003/health
- Versioning e body parsing
  - curl -H "x-api-version: v1" http://localhost:4003/api/v1/health
  - curl -X POST http://localhost:4003/api/v1/auth/login -H "Content-Type: application/json" -d '{"identifier":"admin@example.com","password":"Admin123!"}'
- POST pubblico Activity Log
  - curl -X POST http://localhost:4003/api/v1/activity-logs \
    -H "Content-Type: application/json" \
    -H "X-Tenant-ID: <TENANT_ID>" \
    -d '{"action":"CTA_CLICK","resourceType":"landing","resourceId":"cta-hero","details":{"label":"Scopri di più"}}'
- GET privato Activity Logs
  - curl -H "Authorization: Bearer <JWT>" -H "X-Tenant-ID: <TENANT_ID>" \
    "http://localhost:4003/api/v1/activity-logs?page=1&pageSize=20&action=CTA_CLICK"

## 12) Rischi e mitigazioni
- Mismatch FE/BE: evitare breaking change restituendo nel GET i campi attesi dal FE mappandoli dai details; in un secondo momento riallineare i tipi TS del FE.
- GDPR: non loggare dati personali sensibili nei details; limitare retention (eventuale policy futura su GdprAuditLog/DataRetentionPolicy).
- Tenant: garantire presenza X-Tenant-ID per POST pubblico; fallback non previsto per multi-tenant.
- Performance: indicizzare query su timestamp/action/personId già presenti; usare paginazione server-side.
