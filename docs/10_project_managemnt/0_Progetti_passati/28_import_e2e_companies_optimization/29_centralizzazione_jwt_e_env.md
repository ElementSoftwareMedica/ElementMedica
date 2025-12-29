# Progetto 29 — Centralizzazione JWT e Validazione Env

## Scopo
- Centralizzare la generazione/verifica dei token su un unico servizio (JWTService) per evitare divergenze future.
- Eliminare (o confermare l’assenza) di fallback legacy dei secret: uso esclusivo di variabili d’ambiente.
- Validare obbligatoriamente JWT_SECRET e JWT_REFRESH_SECRET all’avvio dell’API Server.
- Pianificare consolidamento campi e migrazione verso CompanySite dove opportuno, in coerenza con Person/PersonRole/RoleType e deletedAt standard.
- Garantire funzionamento coerente in localhost e Hetzner (Supabase) via configurazione ambiente.

## Stato attuale (verifiche)
- Servizio centralizzato: presente in backend/auth/jwt.js e utilizzato in servizi e route.
  - Login/refresh delegano a JWTService in servizi/route.
- Validazione env: presente in backend/servers/api-server.js (metodo validateEnvironment) per JWT_SECRET e JWT_REFRESH_SECRET.
- Fallback legacy dei secret: non trovati nel runtime backend; nessun default hard-coded.
- Flusso proxy: il Proxy non firma token, solo inoltra; già allineato.

## Evidenze codice (riferimenti principali)
- Servizio JWT: <mcfile name="jwt.js" path="/Users/matteo.michielon/project 2.0/backend/auth/jwt.js"></mcfile>
- AuthService (usa JWTService): <mcfile name="authService.js" path="/Users/matteo.michielon/project 2.0/backend/services/authService.js"></mcfile>
- Route refresh/login v1 (usa JWTService): <mcfile name="authentication.js" path="/Users/matteo.michielon/project 2.0/backend/routes/v1/auth/authentication.js"></mcfile>
- Validazione env server API: <mcfile name="api-server.js" path="/Users/matteo.michielon/project 2.0/backend/servers/api-server.js"></mcfile>

## Attività completate
- Centralizzazione generazione/verifica token su JWTService nei punti critici (login, refresh, middleware).
- Validazione obbligatoria env JWT nel boot dell’API Server (JWT_SECRET, JWT_REFRESH_SECRET).
- CORS/refresh testati via proxy: header X-Refresh-Token e body refresh_token supportati.
- Documentazione aggiornata (minima) su containerizzazione e deploy proxy per chiarire secrets.

## Attività da fare (to-do)
1. Aggiornare documentazione aggiuntiva dove necessario (deployment/technical/troubleshooting/user) con nota: API richiede JWT_SECRET e JWT_REFRESH_SECRET; Proxy non li usa per firmare.
2. Aggiungere test d’integrazione automatici per:
   - Preflight CORS refresh
   - Login + refresh via header e via body
3. Consolidamento campi/migrazione verso CompanySite:
   - Mappatura utilizzi companyId/company nei punti chiave (auth, permessi, visibilità)
   - Piano migrazione schema e servizi verso CompanySite mantenendo Person come unica entità utente e soft delete via deletedAt
   - Rollout incrementale con feature flag
4. Verifica documentazione CI/CD: secrets per ambienti Hetzner/Supabase presenti (JWT_SECRET/JWT_REFRESH_SECRET, DATABASE_URL, ecc.).

## Piano consolidamento CompanySite (alto livello)
- Fase 1: Analisi schema e dipendenze (lettura servizi che usano companyId/company)
- Fase 2: Introduzione CompanySite lato lettura (join/alias) senza breaking changes
- Fase 3: Aggiornamento servizi a usare CompanySite, con migrazione dati assistita
- Fase 4: Deprecazione campi legacy, mantenendo deletedAt standard e Person/PersonRole/RoleType

## Compatibilità ambienti
- Localhost: variabili in .env (no hard-coding). Porte fisse: API 4001, Proxy 4003, Frontend 5173.
- Hetzner + Supabase: variabili impostate via secrets/ambienti; Proxy non necessita JWT secrets per firma.

## Note GDPR
- Nessun bypass per admin; permessi coerenti tramite PersonRole/RoleType.
- Audit trail invariato; token minimizza dati, access token con scope coerente.

## Verifiche consigliate post-modifica (manuali)
- curl http://localhost:4003/health e http://localhost:4001/health
- Login via proxy /api/v1/auth/login e refresh via header/body
- OPTIONS su /api/v1/auth/refresh con Origin del frontend per CORS

## Prossimi passi
- Estendere aggiornamento documentazione nelle sezioni rimanenti (vedi to-do #1)
- Implementare test automatici d’integrazione (vedi to-do #2)
- Avanzare con analisi CompanySite (vedi to-do #3)