# Configurazione Database (Localhost e Hetzner/Supabase)

Questa guida configura il database per il backend (Prisma) in modo conforme alle regole del progetto e al GDPR.

## Variabili d'Ambiente

Imposta le variabili in `backend/.env` basandoti su `backend/.env.example`.

### Opzione A: Postgres Locale
- `DATABASE_URL="postgresql://<LOCAL_USER>:<LOCAL_PASSWORD>@localhost:5432/<LOCAL_DB>?schema=public&sslmode=disable"`
- Assicurati che Postgres sia attivo su `localhost:5432` e che l'utente/database esista.

### Opzione B: Hetzner / Supabase
- `SUPABASE_DATABASE_URL="postgresql://<SUPABASE_USER>:<SUPABASE_PASSWORD>@<SUPABASE_HOST>:5432/<SUPABASE_DB>?schema=public&sslmode=require"`
- Usa SSL obbligatorio (`sslmode=require`).
- Il backend seleziona automaticamente `DATABASE_URL` o `SUPABASE_DATABASE_URL` (fallback) grazie alla configurazione Prisma.

### Altre variabili critiche
- `JWT_SECRET` e `JWT_REFRESH_SECRET`: segreti robusti per la firma token.
- `FRONTEND_URL` e `ALLOWED_ORIGINS`: origini consentite per CORS con credenziali.

## Migrazione Prisma

1. Genera il client Prisma:
   ```bash
   cd backend
   npx prisma generate
   ```
2. Applica lo schema al database:
   ```bash
   npx prisma db push
   # Oppure, se usi migrazioni
   npx prisma migrate dev
   ```

> Se ricevi errori "Can't reach database server", verifica `DATABASE_URL`/`SUPABASE_DATABASE_URL`, rete e SSL.

## Provisioning Utente Admin

Dopo la migrazione, crea/aggiorna l'utente admin e i permessi:

```bash
cd backend
node scripts/admin_fix.cjs
# opzionale:
node fix-admin-permissions-simple.js
```

## Verifiche

- Health:
  ```bash
  curl http://localhost:4001/health
  curl http://localhost:4003/health
  ```
- Login (via proxy 4003):
  ```bash
  curl -X POST http://localhost:4003/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"<email>","password":"<password>"}'
  ```
- Verify:
  ```bash
  curl -H "Authorization: Bearer <access_token>" http://localhost:4003/api/v1/auth/verify
  ```

## Note GDPR
- Nessun bypass: anche admin richiede permessi espliciti.
- Non loggare credenziali o token.
- Cookie HttpOnly attivi su login/refresh.