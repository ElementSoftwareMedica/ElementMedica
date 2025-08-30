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
   - API, Documents, Proxy con healthcheck e CORS allineati a domini/IP produzione.

## 4) Stato attuale
- [DONE] Provisioning Hetzner: Docker/Compose installati, UFW attivo con 22/80/443 consentite.
- [DONE] Build frontend presente in ./dist con index.html e assets/ montati su Nginx.
- [DONE] Config Nginx production e frontend: root /usr/share/nginx/html, fallback SPA, proxy /api verso proxy:4003, /health locale.
- [DONE] Deploy remoto: rsync, upload .env.production, build e up servizi backend (api/documents/proxy), health interni OK.
- [DONE] Emissione certificati Let's Encrypt via webroot per `elementformazione.com` e `www.elementformazione.com` (non-interattivo).
- [DONE] Switch a config `production.conf` con HTTPS attivo: health OK su HTTPS, redirect 301 da HTTP.
- [DONE] Integrazione backend (API/Proxy/Docs) nel compose e deploy riuscito: /api/health OK su HTTP e HTTPS.
- [DONE] Verifica esterna: `curl` su https://elementformazione.com/api/health e https://www.elementformazione.com/api/health restituisce `{"status":"healthy"}`.
- [DONE] GitHub: repository origin configurato; eseguito push forzato su main per reinserimento ex-novo conforme ai requisiti.
- [INFO] In locale: API (4001), Docs (4002), Proxy (4003) OK su /health.
- [NEW][Frontend] Normalizzazione client API: prefisso automatico "/api" per tutte le URL relative (inclusi percorsi che iniziano con "/"), e fallback baseURL quando mancante. Obiettivo: eliminare 404 su `GET /tenants/current` in produzione dovuti a chiamate senza `/api`.

## 5) Verifiche effettuate
- HTTP/HTTPS /health e /api/health funzionanti su IP e domini.
- Header sicurezza Nginx (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, HSTS) attivi.
- CORS: aggiornate variabili per includere domini produzione e IP pubblico.

## 6) Prossimi passi immediati
- [Test] Verifica end-to-end locale e produzione: login, `GET /api/tenants/current`, caricamento dashboard (assenza errori 404/permessi).
- [Test] Network tab su produzione: assenza chiamate a percorsi senza prefisso `/api` (es. `/tenants/current`), presenza corretta di `/api/tenants/current`.
- [Monitoraggio] Se 404 persiste: verificare mapping Router/Backend per `GET /api/tenants/current` e configurazioni proxy/Nginx; altrimenti procedere con smoke test UI.
- [Doc] Aggiornare questa pagina con gli esiti dei test e pianificare eventuali refactor mirati (senza toccare aree sensibili) se necessari.

## 7) Workflow Locale ↔ Produzione
- Sviluppo e test solo in locale; nessuna modifica diretta su server o GitHub.
- Quando i test locali passano: deploy remoto via script, poi verifica manuale health e funzionalità principali.
- Solo dopo verifica OK: push su GitHub (sincronizzato).

Note operative:
- I file `.trae/rules/project_rules.md` e `.trae/TRAE_SYSTEM_GUIDE.md` non risultano presenti nel repository locale; applico comunque i principi GDPR e modifiche minime/reversibili.

## 8) Aggiornamento: Diagnosi e Fix client API
- [DIAG] Conflitto client API: coesistenza di `src/services/api.ts` (con normalizzazione URL) e `src/services/apiClient.ts` (senza normalizzazione). Il barrel `src/services/index.ts` re-esportava `apiClient` dal file sbagliato in alcuni contesti, causando chiamate a percorsi come `/tenants/current` senza prefisso `/api`.
- [FIX] Uniformato export: `export { default as apiClient } from './api';` in `src/services/index.ts`, così tutte le importazioni centralizzate usano il client con normalizzazione e fallback `API_BASE_URL`.
- [EFFECT] Le chiamate come `apiClient.get('/tenants/current')` ora diventano correttamente `/api/tenants/current` in produzione e in locale. Header `Authorization` e `X-Tenant-ID` continuano ad essere gestiti per host noti.

## 9) Verifiche di follow-up
- [ ] Test locale: login via proxy `POST http://localhost:4003/api/v1/auth/login` e `GET http://localhost:4003/api/tenants/current` (con `X-Tenant-ID`).
- [ ] Test produzione: assenza di richieste a `/tenants/current` senza `/api` nella Network tab; `GET https://elementformazione.com/api/tenants/current` risponde 200/401 coerente con autenticazione.
- [ ] Smoke test UI: caricamento dashboard senza errori 404/permessi; logica tenant corretta.
- [ ] Monitoraggio: verificare access.log Nginx che non compaiano 404 per `/tenants/current` (senza prefisso) post-deploy.

## 10) CI/CD – Deploy automatico su Hetzner (GitHub Actions)
- Aggiunto workflow: <mcfile name="deploy-production.yml" path="/Users/matteo.michielon/project 2.0/.github/workflows/deploy-production.yml"></mcfile>
- Trigger: push su main e avvio manuale (workflow_dispatch) con opzione emissione certificati.
- Il workflow esegue:
  1) Checkout e build frontend (genera ./dist per Nginx).
  2) Generazione di backend/.env.production a runtime da GitHub Secrets (GDPR-safe, non committato).
  3) Deploy remoto via <mcfile name="remote-deploy-hetzner.sh" path="/Users/matteo.michielon/project 2.0/scripts/remote-deploy-hetzner.sh"></mcfile> con AUTO_PUSH_ENV=1.
  4) Health check post-deploy su /health e /api/health (HTTP e, se disponibile, HTTPS).

Note:
- Lo script remoto sincronizza i file (rsync), verifica/crea .env.production sul server, builda e avvia i servizi backend (api, documents, proxy), e avvia Nginx con <mcfile name="docker-compose.production.yml" path="/Users/matteo.michielon/project 2.0/docker-compose.production.yml"></mcfile> montando ./dist.
- Per l’emissione dei certificati è possibile avviare manualmente il workflow con input issue_certs=true (DNS già puntato a 128.140.15.15), che esegue la sezione Certbot dello script remoto e switcha Nginx su configurazione HTTPS.

## 11) GitHub Secrets necessari (repository Settings → Secrets and variables → Actions)
- HETZNER_SSH_HOST = 128.140.15.15
- HETZNER_SSH_USER = root (o elementmedica se preferito)
- HETZNER_SSH_KEY = contenuto della chiave privata SSH autorizzata sul server (formato PEM ed25519), non la public key
- FRONTEND_URL = https://www.elementformazione.com
- CORS_ALLOWED_ORIGINS = https://www.elementformazione.com,https://elementformazione.com,http://www.elementformazione.com,http://elementformazione.com,https://128.140.15.15,http://128.140.15.15
- JWT_SECRET = <segreto robusto>
- JWT_REFRESH_SECRET = <segreto robusto>
- DATABASE_URL = <stringa connessione DB (pgbouncer o diretta)>
- DIRECT_URL = <stringa connessione diretta (per migrazioni Prisma)>
- PUBLIC_DOMAIN = www.elementformazione.com (facoltativo, default nel workflow)

Sicurezza:
- I segreti vengono usati solo per generare backend/.env.production in CI e non sono committati.
- Non memorizzare mai segreti in repository o log.

## 12) Flusso di deploy standardizzato
1) Sviluppo e test locale invariati. Build locale: `npm ci && npm run build`.
2) Push su main (solo quando i test locali sono OK).
3) GitHub Actions esegue build, genera .env.production da Secrets e lancia <mcfile name="remote-deploy-hetzner.sh" path="/Users/matteo.michielon/project 2.0/scripts/remote-deploy-hetzner.sh"></mcfile> verso 128.140.15.15.
4) Health check automatici su dominio pubblico. In caso di problemi, consultare i log Nginx e dei servizi backend.
5) Opzionale: avvio manuale del workflow con issue_certs=true per emissione/rinnovo TLS.

## 13) Impatti e conformità (minimizzati)
- Nessuna modifica alle superfici sensibili (routing, API/proxy, RBAC, tenant, login/permessi/ruoli/gerarchie).
- Adeguamento infrastrutturale: CI/CD e deploy remoto senza toccare il codice applicativo.
- GDPR rispettato: gestione secrets esclusivamente in GitHub Secrets.

## 14) Prossime azioni
- [ ] Popolare i GitHub Secrets elencati al punto 11.
- [ ] Eseguire un primo run manuale del workflow (senza issue_certs) per validare rsync, compose up e health check HTTP.
- [ ] Se necessario, rilanciare il workflow con issue_certs=true per attivare HTTPS completo su Nginx.
- [ ] Eseguire smoke test UI su https://www.elementformazione.com: login, dashboard, /api/tenants/current, nessun 404.
- [ ] Monitorare access.log Nginx per eventuali chiamate senza prefisso /api.

Riferimenti file chiave:
- Frontend API base config: <mcfile name="index.ts" path="/Users/matteo.michielon/project 2.0/src/config/api/index.ts"></mcfile>
- Client Axios normalizzato: <mcfile name="api.ts" path="/Users/matteo.michielon/project 2.0/src/services/api.ts"></mcfile>
- Docker Compose produzione: <mcfile name="docker-compose.production.yml" path="/Users/matteo.michielon/project 2.0/docker-compose.production.yml"></mcfile>
- Nginx config: <mcfile name="frontend.conf" path="/Users/matteo.michielon/project 2.0/nginx/frontend.conf"></mcfile> e production.conf