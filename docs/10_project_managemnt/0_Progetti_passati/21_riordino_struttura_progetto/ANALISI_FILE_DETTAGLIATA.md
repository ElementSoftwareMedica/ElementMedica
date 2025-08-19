# 📊 ANALISI DETTAGLIATA FILE DA RIORDINARE

## 🗂️ INVENTARIO COMPLETO

### 🚨 FILE ROOT DA RIMUOVERE (TEMPORANEI/DEBUG)

#### File Documentazione Temporanea
```bash
ADMIN_PERMISSIONS_FIX.md          # → Spostare in docs/troubleshooting/
PLANNING_DETTAGLIATO.md           # → Eliminare (duplicato)
ROLE_FIXES_SUMMARY.md             # → Spostare in docs/troubleshooting/
```

#### File SQL Temporanei
```bash
add-missing-permissions.sql       # → Spostare in backend/scripts/
fix-persons-enum.sql              # → Spostare in backend/scripts/
```

#### File Debug (25+ file)
```bash
debug-auth-token.cjs              # → Eliminare
debug-auth-token.js               # → Eliminare
debug-company-creation.cjs        # → Eliminare
debug-current-auth.cjs            # → Eliminare
debug-current-auth.js             # → Eliminare
debug-hierarchy-direct.cjs        # → Eliminare
debug-middleware-test.cjs         # → Eliminare
debug-permission-generation.js   # → Eliminare
debug-permissions-browser.js     # → Eliminare
debug-permissions-mapping.js     # → Eliminare
debug-permissions-structure.cjs  # → Eliminare
debug-permissions.cjs             # → Eliminare
debug-permissions.js              # → Eliminare
debug-rbac-direct.mjs             # → Eliminare
debug-rbac-service.cjs            # → Eliminare
debug_permissions.cjs             # → Eliminare
debug_permissions.js              # → Eliminare
```

#### File Test (50+ file)
```bash
test-access-debug.cjs             # → Eliminare
test-admin-access-complete.cjs    # → Eliminare
test-admin-access-complete.js     # → Eliminare
test-api-direct.js                # → Eliminare
test-api-logic.cjs                # → Eliminare
test-auth-context.cjs             # → Eliminare
test-auth-simple.cjs              # → Eliminare
test-body-parser.js               # → Eliminare
test-company-fields.cjs           # → Eliminare
test-company-site-creation.cjs    # → Eliminare
test-complete-flow.js             # → Eliminare
test-current-user-hierarchy-debug.cjs # → Eliminare
test-direct-api.cjs               # → Eliminare
test-dynamic-rate-limit.cjs       # → Eliminare
test-existing-companies.cjs       # → Eliminare
test-final-touppercase-*.cjs      # → Eliminare (5 file)
test-frontend-flow.cjs            # → Eliminare
test-frontend-permissions.cjs     # → Eliminare
test-frontend-token.js            # → Eliminare
test-has-permission-debug.js      # → Eliminare
test-has-permission.js            # → Eliminare
test-hierarchy-*.cjs              # → Eliminare (15+ file)
test-hierarchy.js                 # → Eliminare
test-interceptor-*.cjs            # → Eliminare (3 file)
test-login-debug.cjs              # → Eliminare
test-login-debug.js               # → Eliminare
test-login-flow.cjs               # → Eliminare
test-login-flow.js                # → Eliminare
test-login-response.js            # → Eliminare
test-malformed-payload.js         # → Eliminare
test-middleware-*.js              # → Eliminare (3 file)
test-minimal-company.cjs          # → Eliminare
test-move-role-modal-*.cjs        # → Eliminare (2 file)
test-permission-context.js        # → Eliminare
test-permissions-*.cjs            # → Eliminare (5+ file)
test-permissions-*.js             # → Eliminare (3+ file)
test-piva-issue.cjs               # → Eliminare
test-put-roles.js                 # → Eliminare
test-quick.cjs                    # → Eliminare
test-quick.js                     # → Eliminare
test-rate-limit-debug.cjs         # → Eliminare
test-real-payload.js              # → Eliminare
test-real-token.js                # → Eliminare
test-role-*.cjs                   # → Eliminare (5+ file)
test-role-*.js                    # → Eliminare (3+ file)
test-route-debug.js               # → Eliminare
test-routing-system.js            # → Eliminare
test-sidebar-logic.cjs            # → Eliminare
test-simple-login-verify.cjs      # → Mantenere (utile per test)
test-single-case.js               # → Eliminare
test-tenant-debug.js              # → Eliminare
test-token-debug-fixed.js         # → Eliminare
test-token-debug.js               # → Eliminare
test-touppercase-*.cjs            # → Eliminare (5+ file)
test-ultra-simplified-interceptor.cjs # → Eliminare
test-validate-user-tenant.js      # → Eliminare
test-verify-debug.cjs             # → Eliminare
test-verify-endpoint.cjs          # → Eliminare
```

#### File Check (10+ file)
```bash
check-admin-permissions-debug.cjs # → Eliminare
check-admin-permissions.cjs       # → Eliminare
check-and-fix-admin-permissions.js # → Eliminare
check-enum.cjs                    # → Eliminare
check-tenants.cjs                 # → Eliminare
check-user.cjs                    # → Eliminare
```

#### Altri File Temporanei
```bash
cookies.txt                       # → Eliminare
verify-fixes.cjs                  # → Eliminare
test_login.json                   # → Eliminare
add-test-users.cjs                # → Spostare in backend/scripts/
find-users.cjs                    # → Spostare in backend/scripts/
get-tenant-id.cjs                 # → Spostare in backend/scripts/
setup-test-data.cjs               # → Spostare in backend/scripts/
```

### 📁 CARTELLE DA RIORGANIZZARE

#### `/config/` → `/backend/config/`
```bash
advanced-logger.js                # → backend/config/
middleware-manager.js             # → backend/config/
```

#### `/middleware/` → `/backend/middleware/`
```bash
audit-trail.js                    # → backend/middleware/
performance-monitoring.js         # → backend/middleware/
query-logging.js                  # → backend/middleware/
security-logging.js               # → backend/middleware/
```

#### Cartelle da ELIMINARE
```bash
/frontend/                        # → Eliminare completamente (vuota)
/shared/                          # → Eliminare completamente (vuota)
```

### ✅ FILE/CARTELLE DA MANTENERE

#### Configurazioni Essenziali
- `.env*` - Configurazioni ambiente
- `package.json` - Dipendenze
- `tsconfig*.json` - Configurazioni TypeScript
- `vite.config.ts` - Configurazione build
- `tailwind.config.js` - Configurazione CSS

#### Cartelle Principali
- `/backend/` - Backend completo
- `/src/` - Frontend principale
- `/docs/` - Documentazione
- `/tests/` - Test strutturati
- `/.trae/` - Regole progetto

#### File Utili
- `test-simple-login-verify.cjs` - Test login essenziale
- `CHANGELOG.md` - Storico modifiche
- `CONTRIBUTING.md` - Guide contribuzione

## 🎯 PRIORITÀ OPERAZIONI

### ALTA PRIORITÀ
1. **Eliminare file debug/test** dalla root (50+ file)
2. **Eliminare cartelle vuote** (/frontend/, /shared/)
3. **Spostare middleware** in backend

### MEDIA PRIORITÀ
1. **Spostare script utility** in backend/scripts/
2. **Organizzare file SQL** in backend/scripts/
3. **Spostare documentazione** temporanea

### BASSA PRIORITÀ
1. **Pulizia file configurazione** duplicati
2. **Ottimizzazione struttura** cartelle

## 📊 ANALISI CARTELLE SPECIFICHE COMPLETATA

### ✅ CARTELLE VERIFICATE E CORRETTE
- **`/src/`** - ✅ Struttura frontend principale ben organizzata (MANTENERE)
- **`/dist/`** - ✅ Build artifacts corretti (MANTENERE)
- **`/logs/`** - ✅ Directory log server corrette (MANTENERE)
- **`/monitoring/`** - ✅ Configurazioni Grafana/Prometheus (MANTENERE)
- **`/public/`** - ✅ Template CSV pubblici (MANTENERE)
- **`/scripts/`** - ✅ Script deployment e utility (MANTENERE)

### ⚠️ CARTELLE DA RIORGANIZZARE
- **`/config/`** - 2 file middleware da spostare in `/backend/config/`
- **`/middleware/`** - 4 file da spostare in `/backend/middleware/`

### ❌ CARTELLE DA ELIMINARE
- **`/shared/`** - Cartella completamente vuota
- **`/frontend/`** - Cartella obsoleta con solo `/src/components/` vuota

## 📊 STIMA IMPATTO AGGIORNATA

### File da Eliminare: **75+ file** (root)
### Cartelle da Eliminare: **2 cartelle** (/shared/, /frontend/)
### File da Spostare: **6 file** (config + middleware)
### Riduzione Clutter Root: **~80%**

### Dettaglio Operazioni
1. **Eliminazione file root**: 75+ file debug/test/temporanei
2. **Eliminazione cartelle vuote**: /shared/, /frontend/
3. **Spostamento config**: 2 file → /backend/config/
4. **Spostamento middleware**: 4 file → /backend/middleware/
5. **Spostamento script utility**: 4 file → /backend/scripts/

---

**⚠️ NOTA**: Analisi completata su tutte le cartelle specificate. Struttura `/src/` confermata corretta e ben organizzata.