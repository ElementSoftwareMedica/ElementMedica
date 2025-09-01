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

## 7) Prossimi passi immediati
- CORS/Origin: mantenere allineamento tra localhost (sviluppo), domini produzione e IP pubblico (già incluso). Verifica end-to-end con autenticazione.
- Automazione rinnovo certificati: confermare servizio `certbot-renew` attivo e log di rinnovo; valutare reload Nginx post-rinnovo (se necessario).
- GitHub: inizializzazione repository ex-novo e push quando confermata piena funzionalità in produzione (no push prima di verifica completa).
- Frontend build: assicurare pipeline locale (Vite build) coerente con ./dist e integrata nello script di deploy.
- Monitoraggio/Logging: verificare mount volumi logs/ ed eventuale retention.

Note operative:
- I file `.trae/rules/project_rules.md` e `.trae/TRAE_SYSTEM_GUIDE.md` non risultano presenti nel repository locale; applico comunque i principi GDPR e modifiche minime/reversibili.
