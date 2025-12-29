# Piano Operativo: Centralizzazione JWT, rememberMe e Migrazione correlata

Versione: 4.0 Post-Ottimizzazione Server
Ultimo aggiornamento: oggi

## Obiettivi
- Centralizzare generazione e verifica dei token in un unico servizio.
- Propagare correttamente il flag rememberMe end‑to‑end (durate access/refresh token, sessioni, persistenza DB).
- Rimuovere i fallback legacy dei secret, mantenendo solo variabili d’ambiente.
- Validare la presenza delle variabili d’ambiente obbligatorie lato API server.
- Pianificare consolidamento campi e migrazione verso CompanySite in coerenza con le regole di progetto.

## Stato attuale
Fatto
- Centralizzazione firma/verifica in servizio JWT dedicato.
- Propagazione rememberMe lato login v1 con scadenze: access 1h/7d e refresh 7d/30d.
- Test di integrazione aggiunti per verificare expires_in (1h/7d) e persistenza refreshToken (~7/30 giorni).
- Verifiche di variabili d’ambiente: i secret non hanno fallback e sono richiesti a runtime.

In corso
- Rimozione graduale dei fallback legacy nei middleware storici, mantenendo solo la verifica centralizzata nel servizio.

Da fare
- Consolidare documentazione di deployment/tecnica/troubleshooting con le nuove variabili e flussi.
- Valutare e pianificare unificazione campi e migrazione verso CompanySite (senza downtime): schema, mappature, rollout.

## Variabili d’ambiente (API Server)
- JWT_SECRET: richiesto (nessun fallback)
- JWT_REFRESH_SECRET: richiesto (nessun fallback)
- JWT_EXPIRES_IN: default 15m (può essere sovrascritto per esigenze diverse)
- JWT_REFRESH_EXPIRES_IN: default 7d

Note
- Il proxy non firma token; solo l’API server utilizza i secret.
- Tutti i valori vanno forniti via env in localhost e Hetzner (Supabase come DB). Niente hard‑coding.

## Flusso rememberMe
- Login: se remember_me=true
  - Access token: 7 giorni
  - Refresh token: ~30 giorni (persistito in DB con expiresAt coerente)
- Login: se remember_me=false (default)
  - Access token: 1 ora
  - Refresh token: ~7 giorni
- Register: comportamento conservativo (rememberMe disattivo) con refresh ~7 giorni.

## Test aggiunti
- tests/auth-rememberme.test.js
  - Caso default (remember_me=false): verifica expires_in=3600 e refresh ~7 giorni.
  - Caso remember_me=true: verifica expires_in=604800 e refresh ~30 giorni.

Copertura
- API /api/v1/auth/login
- Persistenza refresh token in Prisma (tenant/device info inclusi quando disponibili)

## Compatibilità e Sicurezza
- Funzionante in localhost e su Hetzner con Supabase; config via env.
- Nessun segreto in codice o log; validazione run‑time dei secret obbligatori.
- Nessun bypass: verifiche di ruolo/permessi invariate.

## Migrazione verso CompanySite (Piano)
1) Analisi campi e riferimenti attuali (Person, PersonRole/RoleType, deletedAt standard).
2) Proposta di mapping campi → CompanySite dove opportuno, senza rompere integrazioni.
3) Script di migrazione incrementali (idempotenti) con feature flag.
4) Rollout progressive e fallback plan.

## Rischi e Mitigazioni
- Secret mancanti in env → blocco avvio o errori runtime: mitigato da validazione e log chiari.
- Divergenze durate token → centralizzazione del calcolo e test di integrazione dedicati.
- Dati legacy → piano di migrazione e test di regressione.

## Checklist Operativa
- [x] Centralizzare servizio JWT
- [x] Propagare rememberMe nel login
- [x] Aggiungere test di integrazione rememberMe
- [ ] Ripulire middleware legacy dai fallback secret
- [ ] Aggiornare documentazione (deployment/tecnica/troubleshooting/user)
- [ ] Redigere piano dettagliato migrazione CompanySite

## Changelog
- Aggiunti test: tests/auth-rememberme.test.js
- Aggiornato servizio token per supportare override espliciti delle durate quando necessario
- Validazioni env centralizzate; nessun fallback per i secret