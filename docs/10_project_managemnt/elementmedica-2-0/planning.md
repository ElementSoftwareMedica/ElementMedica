# Element Medica 2.0 — Piano operativo di sincronizzazione e deploy

Ultimo aggiornamento: [auto] inizializzazione planning e allineamento stato attuale

## 1) Stato attuale
- Repository locale: presente il progetto con frontend buildato (cartella `dist/`) e backend minimale (`backend/src/server.js`).
- Configurazioni env:
  - `.env.local` completo per sviluppo locale.
  - `.env.production` presente con variabili di produzione e placeholder per segreti (da NON versionare).
- Nginx: presente solo `nginx/frontend.conf` minimale (HTTP, nessun TLS, nessun proxy API, nessuna gestione ACME).
- Docker/Compose: assenti file `docker-compose.production.yml` e Dockerfile coerenti per backend/frontend.
- Script: assenti script di provisioning e deploy per Hetzner.
- Logs e tracce mostrano che in passato esistevano servizi più articolati (API/Proxy/Docs) ma nel workspace corrente non sono presenti i relativi sorgenti (rotte, middleware, avvii server). Questo è un potenziale BLOCCANTE per un deploy 1:1 dell’intera piattaforma.

Rischi e blocchi:
- BLOCCANTE: Mancano i sorgenti completi dei servizi backend (API 4001, DOCUMENTS 4002, PROXY 4003) citati dalle configurazioni/log. Senza questi, il deploy completo (login, RBAC, tenant, ecc.) non è possibile. Si può comunque procedere con infrastruttura (Nginx + TLS + static frontend) e pipeline di deploy, in attesa dei servizi backend.
- Accesso Hetzner: necessario abilitare accesso SSH via chiave per evitare inserimento interattivo della password e automatizzare il deploy (richiede un singolo accesso con password per installare la chiave, oppure l’inserimento manuale della chiave pubblica nello `~/.ssh/authorized_keys` del server).

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
- [PENDING] Verifica DNS A-record per domini → necessario prima dell’emissione certificati.
- [BLOCKER] Reperire/integrare codice servizi backend (API/Proxy/Docs) prima del deploy funzionale completo (login, RBAC, tenant, ecc.).

## 7) Prossimi passi immediati
- Eseguire provisioning server Hetzner con `scripts/provision-hetzner.sh 128.140.15.15`.
- Sincronizzare e avviare Nginx HTTP con `scripts/remote-deploy-hetzner.sh 128.140.15.15`.
- Emettere certificati TLS quando DNS è attivo.
- Integrare backend quando i sorgenti saranno disponibili o indicati.