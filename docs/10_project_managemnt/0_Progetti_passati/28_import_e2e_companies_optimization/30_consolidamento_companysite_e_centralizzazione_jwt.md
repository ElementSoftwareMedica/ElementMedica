# 30 – Centralizzazione JWT e Consolidamento verso CompanySite (Piano Operativo)

## 1) Scopo e risultati attesi
- Centralizzare la generazione/verifica token delegando a un unico servizio (JWTService) per ridurre divergenze future. File chiave: <mcfile name="jwt.js" path="/Users/matteo.michielon/project 2.0/backend/auth/jwt.js"></mcfile>, eventuali riferimenti in servizi auth esistenti.
- Nel middleware di autenticazione, rimuovere gradualmente i fallback legacy dei secret e basarsi solo su variabili d’ambiente.
- Aggiungere/validare JWT_SECRET e JWT_REFRESH_SECRET nelle variabili d’ambiente dell’API Server. Il Proxy NON firma token.
- Pianificare consolidamento campi e migrazione verso CompanySite dove opportuno, coerente con le regole del progetto (deletedAt, Person entità unica, PersonRole/RoleType).
- Compatibilità ambienti: tutto deve funzionare sia in localhost sia su Hetzner con Supabase. Configurazioni solo via env, no hard-coding.

## 2) Stato attuale sintetico
- JWTService unico disponibile con metodi generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, buildTokenPair, generateTokenPair, refreshAccessToken, revokeSession in <mcfile name="jwt.js" path="/Users/matteo.michielon/project 2.0/backend/auth/jwt.js"></mcfile>.
- Middleware di autenticazione che utilizza JWTService in <mcfile name="middleware.js" path="/Users/matteo.michielon/project 2.0/backend/auth/middleware.js"></mcfile>.
- Rotte refresh/logout uniformate su JWTService nelle implementazioni v1 e advanced: supportano header `X-Refresh-Token` o body `refresh_token` e rispondono con `access_token`, `expires_in` (secondi) e `token_type`.
- Login advanced centralizzato su AuthService.generateTokens + saveRefreshToken; JWTService.buildTokenPair supporta extraClaims sicuri (es. sessionId) nel payload access.
- CORS aggiornato per supportare header `X-Refresh-Token`/`x-refresh-token` nei documenti di deployment.
- RBAC: mappatura esplicita dei permessi courses:* per ruolo ADMIN/SUPER_ADMIN aggiornata nel servizio RBAC.

## 3) Bonifica documentazione – stato
Completato (aggiornamenti sintetici):
- docs/deployment/environment-setup.md – nota centralizzazione JWT e header CORS X-Refresh-Token
- docs/deployment/monitoring.md – rimozione esempi diretti `jwt.sign`/`jwt.verify`, nota JWTService e Proxy non firmante
- docs/troubleshooting/common-issues.md – diagnostica JWT su API Server e note Proxy; aggiunta sezione 403 PUT /api/v1/courses/:id
- docs/troubleshooting/faq.md – FAQ su JWT/Proxy e invio refresh token
- docs/user/LOGIN_INSTRUCTIONS.md – note operative su JWT centralizzato e modalità refresh
- docs/deployment/DOCKER_CONTAINERIZATION_GUIDE.md – scoping segreti JWT solo su API Server
- docs/technical/implementation/gdpr-login-implementation-guide.md – esempi aggiornati a JWTService

Da monitorare (storico):
- Documenti in 10_project_managemnt/0_Progetti_passati contengono esempi legacy con `jwt.sign`/`jwt.verify` (valore storico, non operativi). Nessun intervento richiesto ora.

## 4) Attività tecniche (JWT/RBAC) residue
- [x] Conferma runtime: validazione env JWT all’avvio API Server e assenza fallback secret (bloccante se mancanti) – già implementato in codice, da verificare in ambienti.
- [x] Aggiornamento mappatura RBAC courses:* per ADMIN/SUPER_ADMIN per evitare 403 su PUT corsi.
- [ ] Test smoke via Proxy 4003: login, refresh (header e body), logout, health.
- [ ] QA RBAC: PUT /api/v1/courses/:id con ADMIN → 200; controllo req.person.permissions include courses:update.

## 5) Piano consolidamento verso CompanySite
Obiettivo: concentrare i campi e le responsabilità nei CompanySite dove opportuno, mantenendo Person come entità unica, ruoli in PersonRole con RoleType, soft delete via deletedAt.

5.1 Modello dati (target)
- Person: entità unica; no duplicazioni tra aziende/siti; soft delete con `deletedAt`.
- CompanySite: entità principale per la configurazione di sede (ex campi diffusi in Company/altre tabelle). Relazioni coerenti con Person, Reparto, Permission.
- PersonRole: associa Person a CompanySite con `roleType`/`roleLevel` e validità; indice su (personId, companySiteId, roleType) e soft delete.
- Permission/Policy: verificate a livello di CompanySite; evitare logiche duplicate a livello Company quando superflue.

5.2 Migrazione dati – strategia
- Preparazione:
  - Backup completo DB e checklist ripristino.
  - Freezare scritture durante la migrazione (finestra manutenzione coordinata).
- Migrazione (Prisma/SQL):
  - Aggiungere eventuali colonne mancanti su CompanySite; creare indici/constraint nuovi.
  - Backfill: popolare CompanySite dai dati esistenti (Company/altre tabelle) secondo mapping definito.
  - Aggiornare PersonRole per referenziare CompanySite (se oggi referenzia Company), con migrazione atomica e validazioni.
  - Spostare/normalizzare permessi a livello CompanySite.
  - Rimuovere/deprecare colonne obsolete nelle tabelle origine dopo verifica.
- Validazione:
  - Confronto conteggi e vincoli; query di coerenza; report errori/blocker.

5.3 API backend
- Aggiornare rotte per usare `companySiteId` come chiave primaria del contesto (creazione, update, ricerca, permessi).
- Consolidare rotte duplicate (Company vs CompanySite) e rimuovere le obsolete.
- Autorizzazione: basarsi su PersonRole/RoleType su CompanySite.
- Allineare DTO/validator e middleware.

5.4 Frontend
- Aggiornare componenti che usano Company/CompanySite: CompanyDetails.tsx, MultiSiteManager.tsx, CompanySites.tsx (nomi indicativi presenti nel codice).
- Adeguare store/selettori e chiamate API al nuovo modello (companySiteId).
- Aggiornare viste permessi/ruoli.

5.5 Test e validazione
- Unit/integration backend (auth, permessi, rotte CompanySite).
- E2E principali: login, selezione sede, operazioni CRUD su CompanySite, gestione ruoli/permessi.
- Smoke via Proxy 4003 su porte fisse (frontend 5173, api 4001, proxy 4003).

5.6 Rollout
- Ordine: localhost → staging Hetzner/Supabase → produzione.
- Config via env; nessun hard-coding; segreti gestiti in CI/CD.
- Coordinare eventuali restart/finestre servizio (non autonomamente).

### 5.7 Mapping preliminare campi → CompanySite
- Company.siteName → CompanySite.name
- Company.address + Company.city + Company.province → CompanySite.address{ street, city, province }
- Company.vatNumber (se specifica di sede) → CompanySite.vatNumber (altrimenti resta su Company)
- Reparto.companyId → Reparto.companySiteId
- PersonRole.companyId → PersonRole.companySiteId
- Company.contactEmail/Phone (se per sede) → CompanySite.contact{ email, phone }
- Custom fields specifici per sede → tabella CompanySiteCustomField + CompanySiteCustomFieldValue

## 6) GDPR e sicurezza
- Minimizzare dati personali nei log; non loggare token/refresh/secret.
- Soft delete `deletedAt` rispettata ovunque.
- Nessun bypass di autorizzazioni, nemmeno admin.
- Sessioni scadute pulite; refresh token trattati come credenziali elevate.

## 7) To-do list sintetica
- [x] Bonifica documentazione core (deployment, troubleshooting, user, technical guide)
- [x] Uniformazione rotte refresh/logout su JWTService (v1 e advanced) + test backend verdi
- [x] Login advanced centralizzato su AuthService.generateTokens + saveRefreshToken; JWTService.buildTokenPair supporta extraClaims (sessionId)
- [x] Conferma runtime: validazione env JWT all’avvio API Server e assenza fallback secret
- [x] Aggiornamento RBAC courses:* admin + sezione troubleshooting 403
- [ ] Definizione mapping campi → CompanySite (documento di dettaglio)
- [ ] Migrazione schema (Prisma migration + SQL di backfill)
- [ ] Aggiornamento rotte backend e middleware permessi
- [ ] Aggiornamento componenti frontend e store
- [ ] Suite test (unit/integration/E2E) e smoke finale via Proxy

## 8) Note operative
- Il Proxy NON firma token e non necessita JWT_SECRET/JWT_REFRESH_SECRET.
- L’endpoint `/auth/refresh` accetta refresh token via header `X-Refresh-Token` o body `refresh_token` e risponde con `access_token`, `expires_in` (secondi) e `token_type`.
- Non riavviare server né cambiare porte senza autorizzazione.

## Aggiornamento 2025-09-08 — Verifica permessi Courses
- PARZIALMENTE FATTO: endpoint `/api/v1/auth/verify` aggiornato per includere `courses:update` nella permission map di ADMIN.
- DA FARE (QA): testare aggiornamento corso dalla UI (CompanySite) senza rifare login; attendersi 200/204. In caso di 403, raccogliere log `AUTH_INSUFFICIENT_PERMISSIONS` e confrontare `requiredPermissions` vs `userPermissions`.