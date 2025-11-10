# Proxy Startup Error: Prisma DB Unreachable

## Sintomi
- Il proxy non si avvia e va in crash con errori Prisma del tipo "Can't reach database server at localhost:5432".
- Logs: `Failed to initialize authentication system`, `PrismaClientInitializationError`.

## Causa
- Il proxy inizializza il modulo di autenticazione che esegue una pulizia delle sessioni via Prisma. Il proxy non deve contattare il DB; questa inizializzazione può fallire se il DB non è disponibile.

## Soluzione
1. Disabilita l'inizializzazione dell'auth nel proxy:
   - Imposta la variabile d'ambiente: `PROXY_INIT_AUTH=false`.
   - Avvio: `PROXY_INIT_AUTH=false npm run dev:proxy` (oppure in produzione configura l'env del servizio).
2. Resilienza aggiuntiva lato modulo auth:
   - La funzione `initializeAuth()` ora rileva anche DB non raggiungibile e ignora la pulizia iniziale delle sessioni senza bloccare l'avvio.

## Verifica
- Health check proxy:
  - `curl http://localhost:4003/health` oppure usare uno script Node per effettuare la richiesta se `curl` ha limitazioni locali.
- Test login (usando le credenziali di test standard, non riportarle nei log):
  - POST `http://localhost:4003/api/auth/login` con corpo JSON `{"identifier":"<email>","password":"<password>"}`.
  - Atteso: risposta con `tokens.access_token` e `tokens.refresh_token`.
  - Segui con GET `http://localhost:4003/api/v1/auth/verify` allegando `Authorization: Bearer <access_token>`.

## Note GDPR
- Nessun bypass: tutti gli utenti (inclusi admin) richiedono permessi espliciti.
- Non riportare mai le credenziali di test in log o codice.

## Porte Fisse
- Frontend: 5173
- Proxy: 4003
- API: 4001

## Riferimenti
- `backend/servers/proxy-server.js`: inizializzazione auth resa opzionale via `PROXY_INIT_AUTH`.
- `backend/auth/index.js`: `initializeAuth()` resiliente a DB non raggiungibile.