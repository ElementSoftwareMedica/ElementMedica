# 31 - Centralizzazione JWT e Cleanup Middleware

Versione: 1.0  
Data: 2025-01-25  
Responsabile: Tech Lead

## 1) Scopo e Risultato Atteso
- Centralizzare la generazione/verifica token su JWTService per evitare divergenze future.
- Eliminare fallback legacy dei secret; usare solo variabili ambiente (API server). Il Proxy non firma/valida token.
- Allineare scadenze access/refresh token a policy: 1h/7d (default), 7d/30d con remember_me=true.
- Pianificare consolidamento campi e migrazione verso CompanySite dove opportuno, coerente con regole Person/PersonRole/RoleType e deletedAt.

## 2) Stato Attuale (prima dell'intervento)
- Generazione token duplicata in alcune route legacy; middleware con riferimenti a jsonwebtoken storici nei log.
- Fallback presenti per JWT_EXPIRES_IN; secret già senza fallback (bloccante se mancanti).
- Documentazione parzialmente disallineata su responsabilità Proxy vs API.

## 3) Interventi Eseguiti (completati)
- Allineata rotta advanced di login ad AuthService.generateTokens + AuthService.saveRefreshToken (passando sessionId come extraClaims a JWTService.buildTokenPair). Eliminata duplicazione generazione token/salvataggio diretto in rotta.
- JWTService.buildTokenPair esteso per accettare extraClaims in modo sicuro (no override campi core) per supportare il sessionId nel payload dell'access token.
- Verificato middleware authenticateAdvanced: usa JWTService.verifyAccessToken e gestisce sessionId se presente.
- Rimosse note ambigue: docs/deployment/environment-setup.md aggiornato (secret obbligatori, no fallback; proxy non usa JWT; note su expires_in in secondi).
- Aggiunta sezione Troubleshooting: "JWT secrets mancanti" con sintomi/diagnosi/soluzione.
- Uniformate rotte /auth/refresh e /auth/logout (v1 e advanced) su JWTService con supporto header `X-Refresh-Token` o body `refresh_token`, risposte standardizzate con `access_token`, `expires_in` (in secondi) e `token_type`.
- Standardizzata revoca sessioni con `JWTService.revokeSession` e `JWTService.revokeAllPersonSessions`, mantenendo logging GDPR e allineando status/messaggi tra v1 e advanced.
- Eseguita suite test backend: tutte le suite verdi, nessuna regressione su login/refresh/logout.
- Aggiornata mappatura RBAC per i permessi courses:* (read/create/edit/update/delete) per i ruoli di amministrazione nel servizio RBAC, evitando bypass e garantendo permessi espliciti coerenti con la policy.
- Aggiornata documentazione di troubleshooting con sezione dedicata al 403 su PUT /api/v1/courses/:id (diagnosi, cause e fix).

## 4) Interventi in Corso
- Redazione documento operativo (presente file) con piano di consolidamento CompanySite e roadmap migrazione campi.
- QA mirato: verifica end-to-end della rotta PUT /api/v1/courses/:id via Proxy (4003) con ruolo ADMIN, atteso 200, senza logout/refresh forzati.

## 5) Interventi Pianificati (to-do)
- Verifica univocità gestione sessioni in JWTService vs routes (evitare duplicazioni di salvataggio refresh token) e definire responsabilità uniche.
- Pianificare migrazione: consolidare riferimenti Company vs CompanySite rispettando deletedAt e Person unica.
- Aggiornare guide tecniche in docs/technical/api/authentication.md (breve nota su JWTService e scadenze).

## 6) Impatti e Rischi
- Sicurezza: blocco avvio se JWT_SECRET/JWT_REFRESH_SECRET assenti (voluto). Necessario coordinamento prima dei deploy.
- Compatibilità frontend: expires_in in secondi già mantenuto; test di regressione login obbligatori.
- Performance: centralizzazione riduce duplicazioni e incoerenze; monitorare rate limiting su /api/v1/auth/login.

## 7) Validazioni Post-Intervento (da eseguire)
- Health check: API 4001, Proxy 4003.
- Test login via proxy con credenziali standard (no logging credenziali). Verificare remember_me true/false.
- Verifica CORS se modificata la catena middleware.
- Verifica routes diagnostiche del Proxy e legacy redirect /login.
- QA RBAC: PUT /api/v1/courses/:id con ADMIN deve rispondere 200; verificare che req.person.permissions includa courses:update senza necessità di refresh sessione.

## 8) Note di Conformità GDPR
- Nessun dato sensibile in log; auditing azioni LOGIN/LOGOUT previsto via middleware/servizi esistenti.
- Conservazione RefreshToken regolata da scadenze 7/30 giorni; pianificare job di cleanup scaduti.

## 9) Allegati e Riferimenti
- backend/auth/jwt.js (JWTService)
- backend/services/authService.js (generateTokens + saveRefreshToken)
- backend/routes/v1/auth/authentication.js (login v1)
- backend/routes/auth-advanced.js (login avanzato)
- docs/deployment/environment-setup.md (env)
- docs/troubleshooting/common-issues.md (troubleshooting)

## Aggiornamento 2025-09-08 — Allineamento RBAC /auth/verify
- FATTO: aggiunta chiave `courses:update` nella risposta di `/api/v1/auth/verify` per ruolo ADMIN, coerente con `requirePermissions('courses:update')` nelle rotte Corsi.
- IMPATTO: riduce i 403 su `PUT /api/v1/courses/:id` quando il frontend basa la visibilità azioni sulla mappa permessi di verify.
- PROSSIMI PASSI: QA end-to-end senza logout/reset tenant; verificare `req.person.permissions` nei log RBAC; se necessario, allineare la fase di token issuance affinché includa `courses:update`.